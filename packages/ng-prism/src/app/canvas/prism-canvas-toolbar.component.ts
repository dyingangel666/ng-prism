import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { PrismIconComponent } from '../icons/prism-icon.component.js';
import { CANVAS_BGS, type CanvasBg } from '../../shared/canvas-bg.type.js';
import { PrismCanvasService } from '../services/prism-canvas.service.js';
import { PrismVariantBgService } from '../services/prism-variant-bg.service.js';

/**
 * The canvas tools, as a rail floating over the canvas instead of a band above
 * it.
 *
 * The five entries were never one kind of control, and the split follows that
 * rather than the topic: guides and rulers are toggles you flip constantly
 * while measuring, so they toggle at their own button; canvas background and
 * zoom are choosers you set once, so they move behind a menu; the template is a
 * view rather than a setting and keeps its own button. The zoom *value* stays
 * on the rail as a readout — it is the one number here you read far more often
 * than you set.
 *
 * The host deliberately generates no box. The rail has to be a direct child of
 * `.prism-canvas-wrap` that does not contain the stage, because that is exactly
 * what capture mode's structural rule in `prism-capture.service.ts` suppresses;
 * a rail nested inside the renderer or the stage would survive into every
 * screenshot and silently corrupt visual-regression baselines.
 */
@Component({
  selector: 'prism-canvas-toolbar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrismIconComponent],
  template: `
    <!-- Anchored in .prism-canvas-wrap, deliberately absolute and not fixed:
         a viewport-fixed rail would float over the sidebar and the panel, stay
         put while those are resized, and sit on top of running text in the API
         view where it has no business being. -->
    <div class="prism-toolrail">
      <span class="prism-toolrail__zoom"
        >{{ Math.round(canvas.zoom() * 100) }}%</span
      >

      <button
        type="button"
        class="prism-toolrail__btn"
        [class.is-on]="canvas.guides()"
        (click)="canvas.toggleGuides()"
        title="Toggle guides"
        aria-label="Toggle guides"
        [attr.aria-pressed]="canvas.guides()"
      >
        <prism-icon name="crosshair" [size]="14" />
      </button>

      <button
        type="button"
        class="prism-toolrail__btn"
        [class.is-on]="canvas.rulers()"
        (click)="canvas.toggleRulers()"
        title="Toggle rulers"
        aria-label="Toggle rulers"
        [attr.aria-pressed]="canvas.rulers()"
      >
        <prism-icon name="move" [size]="14" />
      </button>

      <button
        type="button"
        class="prism-toolrail__btn"
        popovertarget="prism-tools"
        title="Canvas and zoom"
        aria-label="Canvas and zoom"
      >
        <prism-icon name="sliders-horizontal" [size]="14" />
      </button>

      <span class="prism-toolrail__sep"></span>

      <button
        type="button"
        class="prism-toolrail__btn"
        popovertarget="prism-template"
        title="Toggle Angular template"
        aria-label="Toggle Angular template"
      >
        <prism-icon name="code" [size]="14" />
      </button>
    </div>

    <!-- Only the two choosers. The toggles stay outside: you flip guides and
         rulers constantly while measuring, and a toggle two clicks deep is the
         classic mistake. What you only ever set may live in a menu. -->
    <div
      popover
      id="prism-tools"
      class="prism-toolmenu"
      role="dialog"
      aria-label="Canvas and zoom"
    >
      <span class="prism-toolmenu__lbl">Canvas</span>
      <div class="prism-toolmenu__row">
        @for (bg of bgs; track bg) {
        <button
          type="button"
          [class.is-on]="variantBg.effective() === bg"
          [class.is-rec]="variantBg.recommended() === bg"
          [attr.title]="bgTitle(bg)"
          (click)="setBg(bg)"
        >
          {{ capitalize(bg) }}
        </button>
        }
      </div>

      <span class="prism-toolmenu__lbl">Zoom</span>
      <div class="prism-toolmenu__row">
        @for (z of zooms; track z.value) {
        <button
          type="button"
          [class.is-on]="canvas.zoom() === z.value"
          (click)="canvas.setZoom(z.value)"
        >
          {{ z.label }}
        </button>
        }
      </div>
    </div>
  `,
  styles: `
    :host { display: contents; }

    .prism-toolrail {
      position: absolute;
      top: var(--sp-4);
      right: var(--sp-4);
      z-index: 4;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--sp-1);
      padding: var(--sp-2);
      border: 1px solid var(--prism-border-strong);
      border-radius: var(--radius-md);
      background: var(--prism-bg-elevated);
      box-shadow: 0 4px 16px -6px rgba(0, 0, 0, 0.4);
      anchor-name: --prism-toolrail;
    }

    .prism-toolrail__zoom {
      width: 100%;
      padding-bottom: var(--sp-1);
      border-bottom: 1px solid var(--prism-border);
      font-family: var(--font-mono);
      font-size: 9px;
      color: var(--prism-text-ghost);
      text-align: center;
    }

    .prism-toolrail__btn {
      display: grid;
      place-items: center;
      width: 26px;
      height: 26px;
      padding: 0;
      border: 0;
      border-radius: var(--radius-xs);
      background: transparent;
      color: var(--prism-text-muted);
      cursor: pointer;
    }
    .prism-toolrail__btn:hover { color: var(--prism-text); }
    .prism-toolrail__btn:focus-visible {
      outline: 2px solid var(--prism-primary);
      outline-offset: 1px;
    }
    .prism-toolrail__btn.is-on {
      background: color-mix(in srgb, var(--prism-primary) 18%, transparent);
      color: var(--prism-text);
    }
    .prism-toolrail__sep {
      width: 14px;
      height: 1px;
      background: var(--prism-border);
      margin: var(--sp-1) 0;
    }

    .prism-toolmenu {
      margin: 0;
      padding: var(--sp-3);
      border: 1px solid var(--prism-border-strong);
      border-radius: var(--radius-md);
      background: var(--prism-bg-elevated);
      box-shadow: 0 8px 28px -10px rgba(0, 0, 0, 0.45);
      gap: var(--sp-2);
      position-anchor: --prism-toolrail;
      position-area: inline-start;
      position-try-fallbacks: flip-inline;
      inset: auto;
      margin-inline-end: var(--sp-2);
    }

    /* display belongs on :popover-open and nowhere else — see the note in
       prism-template-popover.component.ts. An author display on the base
       rule outranks the UA's [popover]:not(:popover-open) { display: none }
       and pins the menu open. */
    .prism-toolmenu:popover-open {
      display: flex;
      flex-direction: column;
    }

    .prism-toolmenu__lbl {
      font-size: var(--fs-xs);
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--prism-text-ghost);
    }
    .prism-toolmenu__row { display: flex; flex-wrap: wrap; gap: var(--sp-1); }
    .prism-toolmenu__row button {
      padding: 2px var(--sp-3);
      border: 1px solid var(--prism-border);
      border-radius: var(--radius-xs);
      background: transparent;
      font-size: var(--fs-md);
      color: var(--prism-text-2);
      cursor: pointer;
      white-space: nowrap;
    }
    .prism-toolmenu__row button.is-on {
      background: color-mix(in srgb, var(--prism-primary) 16%, transparent);
      border-color: color-mix(in srgb, var(--prism-primary) 38%, transparent);
      color: var(--prism-text);
    }
    .prism-toolmenu__row button.is-rec {
      border-color: color-mix(in srgb, var(--prism-primary) 30%, transparent);
    }
  `,
})
export class PrismCanvasToolbarComponent {
  protected readonly canvas = inject(PrismCanvasService);
  protected readonly variantBg = inject(PrismVariantBgService);

  /** Angular templates resolve names against the component, not the global scope. */
  protected readonly Math = Math;

  protected setBg(bg: CanvasBg): void {
    if (this.variantBg.recommended() !== null) {
      this.variantBg.setOverride(bg);
    } else {
      this.canvas.setBg(bg);
    }
  }

  /**
   * Every {@link CanvasBg}, and the canonical list rather than a copy of it.
   *
   * This group is a readout as much as a control: the active button is
   * `effective()` and the recommended one carries the `is-rec` edge. A value
   * missing here therefore cannot be *shown* either — a variant declaring it
   * leaves the whole group with nothing active and the recommendation with
   * nowhere to sit. That is what a shorter list bought when `transparent` was
   * left out of it, so the list is now the type's own.
   *
   * `checker` and `transparent` do paint the same checkerboard here, which is
   * why they carry titles: the difference between them is what a capture does,
   * and the canvas cannot show that. `checker` is deprecated for exactly that
   * reason and says so, but it stays in the list until 23.0.0 — a component
   * can still declare it, and the group has to be able to show what it has.
   */
  protected readonly bgs = CANVAS_BGS;

  /** What a background means, where the canvas cannot show the difference. */
  /**
   * Bound with `[attr.title]`, never `[title]`. A property binding assigns to
   * `HTMLElement.title`, a non-nullable DOMString, so the `null` below would
   * be stringified and every unremarkable button would carry a tooltip
   * reading "null" — four of the six in the common case.
   */
  protected bgTitle(bg: CanvasBg): string | null {
    if (this.variantBg.recommended() === bg) {
      return 'Recommended background for this variant';
    }
    if (bg === 'transparent') {
      return 'Checkerboard here, a real alpha channel in a capture';
    }
    if (bg === 'checker') {
      return 'Deprecated — same look as Transparent, but a capture keeps the themed colour';
    }
    return null;
  }
  protected readonly zooms = [
    { value: 0.75, label: '75%' },
    { value: 1, label: '100%' },
    { value: 1.5, label: '150%' },
    { value: 2, label: '200%' },
  ];

  protected capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
}
