import { Injectable, signal } from '@angular/core';

/** URL query parameter that switches the Prism canvas into capture-isolation mode. */
export const CAPTURE_PARAM = 'capture';

/** Attribute set on `<html>` while capture mode is active. */
export const CAPTURE_ATTRIBUTE = 'data-prism-capture';

const STYLE_ELEMENT_ID = 'ng-prism-capture-styles';

/**
 * Global stylesheet applied in capture mode.
 *
 * This has to be a document-level stylesheet rather than a component `styles`
 * block: Angular's emulated view encapsulation scopes component styles to that
 * component's own content attribute, so a rule written inside the renderer
 * could never reach into the dynamically created showcase component to stop
 * *its* transitions and animations.
 *
 * Stripping `background-image` is what makes the canvas capture-safe without
 * flattening it to one colour. Every `data-bg` value is a background *colour*
 * plus, for all but `plain`, a repeating *pattern* — dots or a checkerboard.
 * The colour is what `@Showcase({ bg })` declares and is deterministic; the
 * pattern is not, because the component is centred, so the pattern's phase
 * beneath it shifts whenever the component changes size and every pixel behind
 * it differs after an unrelated resize. `!important` is required: the stage's
 * own rules are component-scoped and therefore more specific than this one.
 */
const CAPTURE_STYLES = `
[${CAPTURE_ATTRIBUTE}] *,
[${CAPTURE_ATTRIBUTE}] *::before,
[${CAPTURE_ATTRIBUTE}] *::after {
  transition: none !important;
  animation: none !important;
  caret-color: transparent !important;
  scroll-behavior: auto !important;
}

[${CAPTURE_ATTRIBUTE}] .prism-canvas-stage {
  background-image: none !important;
}
`;

/**
 * Capture-isolation mode.
 *
 * Screenshot tools clip the composited page to the capture target's box, so
 * anything painted behind or inside `.demo-wrap` ends up in the image. Capture
 * mode strips the canvas background down to its opaque, patternless colour —
 * keeping whatever `@Showcase({ bg })` declared — suppresses every piece of
 * canvas chrome, locks zoom to 1 and freezes animation, so a variant renders
 * identically on every run.
 *
 * The flag is read once from the URL at construction time and never written
 * back — {@link PrismUrlStateService} rebuilds the query string from scratch,
 * so navigating inside the app drops `?capture=1` from the address bar while
 * the mode itself stays on for the lifetime of the document.
 *
 * Reading in the constructor (rather than during `PrismUrlStateService.init()`)
 * is deliberate: `PrismCanvasService` restores persisted zoom in *its* own
 * constructor, which can run first, so anything init-order dependent would
 * make zoom-locking racy.
 */
@Injectable({ providedIn: 'root' })
export class PrismCaptureService {
  private readonly _active = signal(
    typeof window !== 'undefined'
      ? parseCaptureParam(window.location.search)
      : false
  );

  /** True while the app renders for an external screenshot tool. */
  readonly active = this._active.asReadonly();

  constructor() {
    if (this._active()) this.applyToDocument();
  }

  private applyToDocument(): void {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute(CAPTURE_ATTRIBUTE, '');
    if (document.getElementById(STYLE_ELEMENT_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ELEMENT_ID;
    style.textContent = CAPTURE_STYLES;
    document.head.appendChild(style);
  }
}

/**
 * Parses the capture flag out of a `window.location.search` string.
 *
 * Accepts `?capture`, `?capture=1` and `?capture=true` as "on"; anything else
 * (including `?capture=0` and `?capture=false`) is "off".
 */
export function parseCaptureParam(search: string): boolean {
  const value = new URLSearchParams(search).get(CAPTURE_PARAM);
  if (value === null) return false;
  return value === '' || value === '1' || value === 'true';
}
