import { computed, effect, inject, Injectable, signal } from '@angular/core';
import type { CanvasBg } from '../../shared/canvas-bg.type.js';
import { PrismCanvasService } from './prism-canvas.service.js';
import { PrismCaptureService } from './prism-capture.service.js';
import { PrismNavigationService } from './prism-navigation.service.js';
import { PrismRendererService } from './prism-renderer.service.js';

@Injectable({ providedIn: 'root' })
export class PrismVariantBgService {
  private readonly canvas = inject(PrismCanvasService);
  private readonly navigation = inject(PrismNavigationService);
  private readonly renderer = inject(PrismRendererService);
  private readonly capture = inject(PrismCaptureService);

  readonly recommended = computed<CanvasBg | null>(() => {
    const comp = this.navigation.activeComponent();
    if (!comp) return null;
    const variant =
      comp.meta.showcaseConfig.variants?.[this.renderer.activeVariantIndex()];
    return variant?.bg ?? comp.meta.showcaseConfig.bg ?? null;
  });

  private readonly _override = signal<CanvasBg | null>(null);
  readonly override = this._override.asReadonly();

  /**
   * The background the stage actually paints.
   *
   * Capture mode wins over every other source — including a declared
   * `@Showcase({ bg })`, a per-variant `bg` and a manual user override —
   * because an element-scoped screenshot composites whatever is painted behind
   * the component into the image, and a patterned background shifts under a
   * centred component whenever that component changes size.
   */
  readonly effective = computed<CanvasBg>(() =>
    this.capture.active()
      ? 'plain'
      : this._override() ?? this.recommended() ?? this.canvas.bg()
  );

  /** True when the user's override differs from the (non-null) recommended bg. */
  readonly isDeviating = computed<boolean>(() => {
    const override = this._override();
    const recommended = this.recommended();
    return (
      override !== null && recommended !== null && override !== recommended
    );
  });

  constructor() {
    effect(() => {
      this.navigation.activeComponent();
      this.renderer.activeVariantIndex();
      this._override.set(null);
    });
  }

  setOverride(bg: CanvasBg): void {
    this._override.set(bg);
  }

  clearOverride(): void {
    this._override.set(null);
  }
}
