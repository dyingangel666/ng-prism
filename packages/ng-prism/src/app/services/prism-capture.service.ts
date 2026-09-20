import { Injectable, signal } from '@angular/core';

/** URL query parameter that switches the Prism canvas into capture-isolation mode. */
export const CAPTURE_PARAM = 'capture';

/** Attribute set on `<html>` while capture mode is active. */
export const CAPTURE_ATTRIBUTE = 'data-prism-capture';

const STYLE_ELEMENT_ID = 'ng-prism-capture-styles';

/**
 * Everything capture mode makes see-through for `bg: 'transparent'`.
 *
 * A screenshot tool clips the *composited* page, so a transparent stage alone
 * buys nothing: the wrappers behind it keep painting and the PNG comes back
 * opaque. The stage and every ancestor that paints have to go at once, which
 * is why this is one selector rather than a rule per layer.
 *
 * `html` and `body` are insurance rather than observation — ng-prism paints
 * neither, but a consuming app's global stylesheet can, and the guarantee this
 * makes is "nothing opaque between the component and the document root".
 * Above `html` the backdrop is the browser's own and no stylesheet reaches it;
 * a runner has to clear that with `omitBackground: true`.
 *
 * `prism-shell` is the *host element* the app bootstraps into, not the
 * `div.prism-shell` inside its template — both are in the chain and either can
 * be given a background, a `:host` rule being the easy way to do it by
 * accident. `.prism-body` is the grid between the shell and `.prism-main` and
 * is listed on the same insurance grounds.
 *
 * Scoped by `:has()` to a *transparent* stage, so the other five backgrounds
 * behave exactly as before. Exported so a test can assert the invariant
 * against the real DOM rather than against this list — the list is the
 * fragile part of the feature. A renamed wrapper or a newly introduced
 * painting layer turns the capture opaque again, and an opaque capture still
 * looks correct; it just silently stops testing transparency.
 */
export const CAPTURE_TRANSPARENT_SELECTOR =
  `[${CAPTURE_ATTRIBUTE}] .prism-canvas-stage[data-bg='transparent'],\n` +
  `[${CAPTURE_ATTRIBUTE}] :is(html, body, prism-shell, .prism-shell, .prism-body, .prism-main, .prism-canvas-wrap):has(.prism-canvas-stage[data-bg='transparent'])`;

/**
 * Everything capture mode removes from layout so the canvas owns the viewport.
 *
 * The canvas is not an overlay host: `.prism-canvas-wrap` is one flex sibling
 * among several inside `.prism-main`, which is itself one grid cell of
 * `.prism-body` inside `.prism-shell`. A screenshot tool captures the *screen
 * coordinates* of `.demo-wrap`, and `.demo-wrap` is centred in a stage that
 * scrolls — so whenever the component is larger than the canvas viewport, its
 * box extends past the canvas and the compositor fills those coordinates with
 * whichever sibling lives there. Measured in Chromium against the real
 * stylesheets, a 200x400 component at a 1280x720 viewport leaks 57px upwards
 * into the variant ribbon and 121px downwards into the panel. That is neither
 * a z-order nor a clipping bug: the capture target legitimately extends beyond
 * its scroll container and the page paints something there.
 *
 * `display: none` rather than `visibility: hidden`, and this is the one thing
 * not to "simplify" later. Keeping the layout box is the tempting minimal-churn
 * fix — nothing re-centres, no unaffected baseline moves — and it does not
 * work: the box still occupies its space, so what paints at those coordinates
 * becomes `.prism-main`'s own background instead of the panel. Measured at the
 * bottom row of a `bg: 'transparent'` capture: `#11284e` with the panel left
 * alone, `#11284e` with `visibility: hidden`, transparent only once the panel
 * leaves layout. The canvas is `flex: 1`; it has to reclaim the space for the
 * stage to paint there, and only removal from layout gives it back.
 *
 * Written as a structural rule rather than a list of chrome selectors, because
 * enumeration is what makes this class of bug recur: the list has to be revised
 * every time the shell grows a region, nothing fails when it is not, and the
 * baselines recorded in the meantime look perfectly fine while guarding the
 * wrong image. At every level from the shell to the canvas wrap, the one child
 * that leads to the stage survives and every sibling is removed, so a region
 * added tomorrow is suppressed without anyone remembering this file exists.
 *
 * The track collapses are not cosmetic. `.prism-shell` and `.prism-body` are
 * grids with sized tracks (`52px 1fr`, `var(--sw) 4px 1fr`); hiding the header
 * and the sidebar without collapsing them would auto-place the survivor into
 * the *first* track and render the canvas 52px tall or 264px wide.
 *
 * Scoped by `:has(.prism-canvas-stage)` throughout: a component page or a view
 * panel has no canvas, and blanking the shell around it would leave a runner
 * with an empty screenshot rather than an honest one.
 */
const CAPTURE_CANVAS_ONLY_SELECTOR =
  `[${CAPTURE_ATTRIBUTE}] ` +
  `:is(.prism-shell, .prism-body, .prism-main, .prism-canvas-wrap)` +
  `:has(.prism-canvas-stage) > :not(:has(.prism-canvas-stage))`;

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
 *
 * `transparent` is the one value that drops the colour too, and it cannot do
 * that on the stage alone — see {@link CAPTURE_TRANSPARENT_SELECTOR} for the
 * layers involved. Alpha is not what the paragraph above rules out: a pattern
 * has a phase that moves when the component resizes, an alpha channel is a
 * per-pixel value that does not.
 *
 * Colour is only half of it. The rules from
 * {@link CAPTURE_CANVAS_ONLY_SELECTOR} down hand the whole viewport to the
 * canvas, which is what makes the declared background reach the *whole* of the
 * capture target's box rather than only the part that happens to fit inside
 * the canvas viewport.
 *
 * The stage's padding goes with them, and it buys more than the 32px it looks
 * like. The stage is `height: 100%` under `content-box`, so its padding lands
 * *outside* that height: the stage is 64px taller than the row it sits in,
 * overflows it, and centres the component 32px below the true centre of what
 * is actually painted. Dropping the padding makes the stage exactly the canvas
 * and the component's centre the viewport's centre, which turns the guarantee
 * crisp — a component is contained iff it fits the viewport. Measured: a
 * 200x700 component at 1280x720 still leaks 22px past the canvas with the
 * regions gone but the padding kept. None of that padding is ever inside a
 * `.demo-wrap` screenshot, so nothing is lost by removing it.
 *
 * The stage's edge goes with them, and it is stripped rather than reshaped for
 * the same reason it exists in that shape at all. The edge is deliberately
 * built from `outline` plus `box-shadow` and never from a border or padding,
 * because neither participates in layout: `plugin-visual-regression`
 * screenshots `.demo-wrap`, which is centred in the stage, and a border would
 * shrink the stage's content box by 2px and move that centre, shifting every
 * recorded baseline without a component having changed. Not participating in
 * layout is not the same as not painting. `outline-offset: -1px` draws the
 * line *inside* the border box, and with the padding above gone the stage edge
 * sits flush against the component, so for anything whose `.demo-wrap` reaches
 * it that 1px line and the shadow under it composite straight into the
 * screenshot. So capture mode removes the paint and leaves the geometry
 * untouched — the same division of labour the edge was chosen for, and the
 * only one that keeps both halves of the guarantee.
 *
 * {@link CAPTURE_TRANSPARENT_SELECTOR} cannot cover this: it clears background
 * colour, and an outline is not a background.
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
  padding: 0 !important;
  outline: none !important;
  box-shadow: none !important;
}

${CAPTURE_TRANSPARENT_SELECTOR} {
  background-color: transparent !important;
  background-image: none !important;
}

${CAPTURE_CANVAS_ONLY_SELECTOR} {
  display: none !important;
}

[${CAPTURE_ATTRIBUTE}] .prism-shell:has(.prism-canvas-stage) {
  grid-template-rows: minmax(0, 1fr) !important;
}

[${CAPTURE_ATTRIBUTE}] .prism-body:has(.prism-canvas-stage) {
  grid-template-columns: minmax(0, 1fr) !important;
}

[${CAPTURE_ATTRIBUTE}] .prism-canvas-wrap:has(.prism-canvas-stage) {
  grid-template-rows: minmax(0, 1fr) !important;
}
`;

/**
 * Capture-isolation mode.
 *
 * Screenshot tools clip the composited page to the capture target's box, so
 * anything painted behind or inside `.demo-wrap` ends up in the image. Capture
 * mode strips the canvas background down to its patternless colour — keeping
 * whatever `@Showcase({ bg })` declared, or clearing the whole paint chain to
 * real transparency for `bg: 'transparent'` — suppresses every piece of
 * canvas chrome, removes every other shell region from layout so the canvas
 * owns the viewport, locks zoom to 1 and freezes animation, so a variant
 * renders identically on every run.
 *
 * What that buys a runner is the right to screenshot `.demo-wrap` directly:
 * the target is composited against the declared background over its whole box,
 * not merely over the part that fits inside the canvas viewport. The one thing
 * the mode cannot do is make room that the viewport does not have — a
 * component larger than the viewport still overflows, and sizing the viewport
 * to fit is the runner's job.
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
