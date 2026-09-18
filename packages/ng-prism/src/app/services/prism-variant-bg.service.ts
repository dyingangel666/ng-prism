import { computed, effect, inject, Injectable, signal } from '@angular/core';
import type { CanvasBg } from '../../shared/canvas-bg.type.js';
import {
  declaredVariantBg,
  DEFAULT_VARIANT_BG,
} from '../../shared/variant-bg.js';
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
    return declaredVariantBg(
      comp.meta.showcaseConfig,
      this.renderer.activeVariantIndex()
    );
  });

  private readonly _override = signal<CanvasBg | null>(null);
  readonly override = this._override.asReadonly();

  /**
   * The background the stage actually paints.
   *
   * Capture mode keeps the *declared* background. `@Showcase({ bg })` and a
   * per-variant `bg` exist precisely so a component is judged against the
   * surface it was designed for — an outlined button on `dark` proves nothing
   * when it is screenshotted on the light default — so a capture that dropped
   * them would pin the wrong image.
   *
   * What capture mode does drop is the manual user override: session UI state
   * that must never decide what a baseline looks like. The other half of the
   * determinism problem — the dot grid and the checkerboard, whose phase shifts
   * under a centred component whenever that component changes size — is solved
   * in `CAPTURE_STYLES`, which strips the pattern and leaves the colour. Colour
   * is deterministic; the pattern is not.
   *
   * With no declared bg capture mode lands on {@link DEFAULT_VARIANT_BG} rather
   * than on the canvas default. `dots` would paint `--prism-bg-surface`, a
   * *theme* token, so the surface behind an undeclared component would depend
   * on whichever theme the runner's browser started in — a baseline that
   * flips with a persisted UI preference. The fixed default is also exactly
   * what the discovery manifest reports for the variant, so what a tool is
   * told and what it screenshots cannot drift apart. That default is
   * `transparent`, which removes the theme dependency outright instead of
   * pinning one theme's colour: an undeclared variant has no opinion about its
   * surface, and no surface is the honest capture of that.
   *
   * Interactive mode keeps `canvas.bg()`: there the dot grid on the themed
   * surface is the point, and forcing `light` would break dark-theme browsing.
   */
  readonly effective = computed<CanvasBg>(() =>
    this.capture.active()
      ? this.recommended() ?? DEFAULT_VARIANT_BG
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
