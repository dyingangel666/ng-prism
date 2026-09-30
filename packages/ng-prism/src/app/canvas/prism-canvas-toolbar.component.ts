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
  templateUrl: './prism-canvas-toolbar.component.html',
  styleUrl: './prism-canvas-toolbar.component.css',
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
