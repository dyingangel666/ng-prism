import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  signal,
} from '@angular/core';
import { resolveAssetUrl } from './asset-url.js';
import { bgChange, shotSurfaceStyle } from './vrt-bg.js';
import { formatPercent } from './vrt-summarize.js';
import { frameWidthStyle, ZOOMS, type Zoom } from './vrt-zoom.js';
import type { VrtVariantResult } from './visual-regression.types.js';

type CompareMode = 'wipe' | 'side-by-side' | 'diff';

const MODE_LABEL: Record<CompareMode, string> = {
  wipe: 'Wipe',
  'side-by-side': 'Side by side',
  diff: 'Diff',
};

/**
 * The comparison stage: toolbar, zoom, and the three ways to look at a variant.
 *
 * Owns its own URL resolution and mode state so the panel shell stays a shell.
 * Everything it needs is in the one variant it is handed.
 */
@Component({
  selector: 'prism-vrt-compare',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="vrt-cmp">
      @if (showToolbar()) {
      <div class="vrt-cmp__bar">
        <div class="vrt-cmp__modes">
          @for (mode of availableModes(); track mode) {
          <button
            type="button"
            class="vrt-cmp__mode"
            [class.vrt-cmp__mode--active]="mode === activeMode()"
            (click)="requestedMode.set(mode)"
          >
            {{ MODE_LABEL[mode] }}
          </button>
          }
        </div>

        <div class="vrt-cmp__right">
          <span class="vrt-cmp__meta">
            @if (variant().width && variant().height) {
            <span>{{ variant().width }}×{{ variant().height }}</span>
            } @if (variant().diffPixels !== undefined) {
            <span>{{ variant().diffPixels!.toLocaleString() }} px</span>
            } @if (variant().diffRatio !== undefined) {
            <span
              class="vrt-cmp__ratio"
              [attr.data-hot]="variant().diffRatio! > 0 ? '' : null"
              >{{ percent(variant().diffRatio!) }}</span
            >
            } @if (variant().bg; as bg) {
            <span
              class="vrt-cmp__bg"
              title="The canvas background this capture was taken on"
              >on {{ bg }}</span
            >
            }
          </span>

          @if (canZoom()) {
          <div class="vrt-cmp__zooms">
            @for (z of ZOOMS; track z) {
            <button
              type="button"
              class="vrt-cmp__zoom"
              [class.vrt-cmp__zoom--active]="z === zoom()"
              (click)="zoom.set(z)"
            >
              {{ z === 'fit' ? 'Fit' : z + '×' }}
            </button>
            }
          </div>
          }
        </div>
      </div>
      } @if (variant().status === 'excluded') {
      <div class="vrt-cmp__note">
        <b>Excluded from visual regression.</b>
        <span>
          Nothing was captured for this variant.@if (variant().reason) {
          {{ variant().reason }} }
        </span>
      </div>
      } @else { @if (bgMove(); as move) {
      <div class="vrt-cmp__note vrt-cmp__note--warn">
        <b>Background changed.</b>
        <span>
          The baseline was captured on <code>{{ move.from }}</code
          >, this run on <code>{{ move.to }}</code> — the difference is the
          surface, not necessarily the component. Re-record the baseline.
        </span>
      </div>
      } @if (variant().status === 'size-mismatch') {
      <div class="vrt-cmp__note vrt-cmp__note--warn">
        <b>Dimensions changed.</b>
        <span
          >No pixel comparison was possible — compare the images directly.</span
        >
      </div>
      } @if (images(); as img) { @switch (activeMode()) { @case ('wipe') {
      <div class="vrt-cmp__stage">
        <div class="vrt-cmp__frame" [style]="frameStyle()">
          <div class="vrt-cmp__shot vrt-cmp__wipe" [style]="currentSurface()">
            <img class="vrt-cmp__img" [src]="img.left" [alt]="img.leftLabel" />
            <div
              class="vrt-cmp__wipe-top"
              [style.clip-path]="'inset(0 0 0 ' + wipe() + '%)'"
            >
              <img
                class="vrt-cmp__img"
                [src]="img.right"
                [alt]="img.rightLabel"
              />
            </div>
            <div class="vrt-cmp__wipe-handle" [style.left.%]="wipe()"></div>
          </div>
          <!-- Inside the frame, so the slider travel always matches the image
               it controls, at any zoom. -->
          <input
            class="vrt-cmp__slider"
            type="range"
            min="0"
            max="100"
            aria-label="Comparison position"
            [value]="wipe()"
            (input)="wipe.set(+$any($event.target).value)"
          />
          <div class="vrt-cmp__legend">
            <span>{{ img.leftLabel }}</span>
            <span>{{ img.rightLabel }}</span>
          </div>
        </div>
      </div>
      } @case ('side-by-side') {
      <div class="vrt-cmp__stage vrt-cmp__stage--split">
        <figure class="vrt-cmp__frame" [style]="frameStyle()">
          <figcaption>{{ img.leftLabel }}</figcaption>
          <div class="vrt-cmp__shot" [style]="baselineSurface()">
            <img class="vrt-cmp__img" [src]="img.left" [alt]="img.leftLabel" />
          </div>
        </figure>
        <figure class="vrt-cmp__frame" [style]="frameStyle()">
          <figcaption>{{ img.rightLabel }}</figcaption>
          <div class="vrt-cmp__shot" [style]="currentSurface()">
            <img
              class="vrt-cmp__img"
              [src]="img.right"
              [alt]="img.rightLabel"
            />
          </div>
        </figure>
      </div>
      } @case ('diff') {
      <div class="vrt-cmp__stage">
        <div class="vrt-cmp__frame" [style]="frameStyle()">
          <div class="vrt-cmp__shot" [style]="currentSurface()">
            <img class="vrt-cmp__img" [src]="diffUrl()" alt="Pixel diff" />
          </div>
        </div>
      </div>
      } } } @else if (singleImage(); as single) {
      <div class="vrt-cmp__note">
        <b>{{ single.title }}</b>
        <span>{{ single.note }}</span>
      </div>
      <div class="vrt-cmp__stage">
        <div class="vrt-cmp__frame" [style]="frameStyle()">
          <div class="vrt-cmp__shot" [style]="single.surface">
            <img class="vrt-cmp__img" [src]="single.src" [alt]="single.label" />
          </div>
        </div>
      </div>
      } @else {
      <div class="vrt-cmp__note">
        <b>No images recorded.</b>
        <span>
          The report has a result for this variant but no file paths.
        </span>
      </div>
      } }
    </div>
  `,
  styles: `
    :host { display: block; min-width: 0; height: 100%; }

    /* Fills the viewer column rather than growing with its content, so the
       stage gets whatever height is left over instead of the panel scrolling.
       The toolbar then stays put while a large capture scrolls inside the
       stage, which is the one place scrolling belongs here. */
    .vrt-cmp {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 14px 16px;
      min-width: 0;
      height: 100%;
    }

    .vrt-cmp__bar {
      flex: none;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
      border-bottom: 1px solid var(--prism-border);
    }

    .vrt-cmp__right {
      display: flex;
      align-items: center;
      gap: 12px;
      padding-bottom: 7px;
    }

    /* Mode switching is the same act as the a11y panel's sub-tabs, so it gets
       the same underline treatment rather than a third kind of button. */
    .vrt-cmp__modes { display: flex; gap: 2px; }

    .vrt-cmp__mode {
      position: relative;
      padding: 6px 11px 8px;
      background: none;
      border: none;
      cursor: pointer;
      font-family: var(--font-sans);
      font-size: 12px;
      font-weight: 500;
      color: var(--prism-text-muted);
      transition: color var(--dur-fast);
    }
    .vrt-cmp__mode:hover { color: var(--prism-text-2); }
    .vrt-cmp__mode--active { color: var(--prism-text); }
    .vrt-cmp__mode--active::after {
      content: '';
      position: absolute;
      left: 6px;
      right: 6px;
      bottom: -1px;
      height: 2px;
      border-radius: 1px;
      background: var(--prism-primary);
    }

    .vrt-cmp__meta {
      display: flex;
      align-items: center;
      gap: 8px;
      font-family: var(--font-mono);
      font-size: var(--fs-sm);
      color: var(--prism-text-muted);
    }
    .vrt-cmp__meta > span + span::before {
      content: '·';
      margin-right: 8px;
      color: var(--prism-text-ghost);
    }
    .vrt-cmp__ratio { color: var(--prism-success); }
    .vrt-cmp__ratio[data-hot] { color: var(--prism-danger); }

    .vrt-cmp__zooms {
      display: flex;
      gap: 1px;
      padding: 2px;
      background: var(--prism-input-bg);
      border-radius: var(--radius-md);
    }
    .vrt-cmp__zoom {
      padding: 3px 8px;
      border: none;
      background: none;
      border-radius: var(--radius-sm);
      cursor: pointer;
      font-family: var(--font-mono);
      font-size: var(--fs-sm);
      color: var(--prism-text-muted);
      transition: color var(--dur-fast), background var(--dur-fast);
    }
    .vrt-cmp__zoom:hover { color: var(--prism-text-2); }
    .vrt-cmp__zoom--active {
      background: var(--prism-bg-elevated);
      color: var(--prism-text);
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.18);
    }

    .vrt-cmp__stage {
      /* Takes the leftover height, but only down to a floor — below that the
         viewer column scrolls instead, because a stage squashed to nothing is
         not a comparison. */
      flex: 1;
      min-height: 140px;
      display: flex;
      /* overflow-safe centring: justify-content would clip the left edge of an
         image wider than the stage, margin auto scrolls to it instead. */
      overflow: auto;
      padding: 14px;
      background: var(--prism-bg-surface);
      border: 1px solid var(--prism-border);
      border-radius: var(--radius-lg);
      min-width: 0;
      /* How wide one frame may grow under the fit zoom. Side by side there are
         two of them, so each gets half the stage minus the gap. This is an
         inherited custom property rather than flex-grow, because a growing
         flex item ignores its own width -- which is exactly what the explicit
         zoom steps set. */
      --vrt-gap: 16px;
      --vrt-fit-basis: 100%;
    }
    .vrt-cmp__stage--split {
      gap: var(--vrt-gap);
      --vrt-fit-basis: calc((100% - var(--vrt-gap)) / 2);
    }

    /* auto margins rather than the stage centring its children: with
       overflow:auto on the stage, centring clips the leading edge of
       anything larger than it, while auto margins scroll to it. */
    .vrt-cmp__frame {
      margin: auto;
      display: flex;
      flex-direction: column;
      gap: 8px;
      flex: none;
    }
    .vrt-cmp__stage--split .vrt-cmp__frame { margin: auto 0; }

    figure.vrt-cmp__frame figcaption {
      font-size: var(--fs-sm);
      color: var(--prism-text-muted);
    }

    /* A checkerboard makes transparent regions of a PNG legible. */
    .vrt-cmp__shot {
      position: relative;
      border: 1px solid var(--prism-border);
      border-radius: var(--radius-sm);
      overflow: hidden;
      background-image:
        linear-gradient(45deg, var(--prism-border) 25%, transparent 25%),
        linear-gradient(-45deg, var(--prism-border) 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, var(--prism-border) 75%),
        linear-gradient(-45deg, transparent 75%, var(--prism-border) 75%);
      background-size: 12px 12px;
      background-position: 0 0, 0 6px, 6px -6px, -6px 0;
    }

    .vrt-cmp__img {
      display: block;
      width: 100%;
      height: auto;
      /* Zooming a diff is only useful if the pixels stay pixels. */
      image-rendering: pixelated;
    }

    .vrt-cmp__wipe-top { position: absolute; inset: 0; }
    .vrt-cmp__wipe-handle {
      position: absolute;
      top: 0;
      bottom: 0;
      width: 2px;
      margin-left: -1px;
      background: var(--prism-primary);
      box-shadow: 0 0 0 1px color-mix(in srgb, var(--prism-void) 45%, transparent);
      pointer-events: none;
    }

    .vrt-cmp__slider {
      width: 100%;
      margin: 0;
      appearance: none;
      background: none;
      cursor: ew-resize;
    }
    .vrt-cmp__slider::-webkit-slider-runnable-track {
      height: 4px;
      border-radius: 2px;
      background: var(--prism-input-bg);
    }
    .vrt-cmp__slider::-moz-range-track {
      height: 4px;
      border-radius: 2px;
      background: var(--prism-input-bg);
    }
    .vrt-cmp__slider::-webkit-slider-thumb {
      appearance: none;
      width: 13px;
      height: 13px;
      margin-top: -4.5px;
      border-radius: 50%;
      background: var(--prism-primary);
      border: 2px solid var(--prism-bg-elevated);
      box-shadow: 0 0 0 1px var(--prism-border-strong);
    }
    .vrt-cmp__slider::-moz-range-thumb {
      width: 13px;
      height: 13px;
      border-radius: 50%;
      background: var(--prism-primary);
      border: 2px solid var(--prism-bg-elevated);
      box-shadow: 0 0 0 1px var(--prism-border-strong);
    }

    .vrt-cmp__legend {
      display: flex;
      justify-content: space-between;
      font-size: var(--fs-sm);
      color: var(--prism-text-muted);
    }

    .vrt-cmp__note {
      flex: none;
      display: flex;
      flex-direction: column;
      gap: 3px;
      padding: 10px 12px;
      background: var(--prism-bg-surface);
      border: 1px solid var(--prism-border);
      border-left: 3px solid var(--prism-text-muted);
      border-radius: var(--radius-md);
      font-size: var(--fs-md);
    }
    .vrt-cmp__note b { font-weight: 600; color: var(--prism-text); }
    .vrt-cmp__note span { color: var(--prism-text-muted); }
    .vrt-cmp__note--warn { border-left-color: var(--prism-warn); }
    /* Matches the panel shell's own inline code, so a background name reads
       the same wherever it appears. */
    .vrt-cmp__note code {
      font-family: var(--font-mono);
      font-size: var(--fs-sm);
      padding: 1px 5px;
      border-radius: var(--radius-xs);
      background: var(--prism-input-bg);
    }
  `,
})
export class VrtCompareComponent {
  readonly variant = input.required<VrtVariantResult>();
  readonly assetBaseUrl = input('');

  protected readonly requestedMode = signal<CompareMode | null>(null);
  protected readonly zoom = signal<Zoom>('fit');
  protected readonly wipe = signal(50);

  protected readonly MODE_LABEL = MODE_LABEL;
  protected readonly ZOOMS = ZOOMS;

  private readonly baselineUrl = computed(() =>
    resolveAssetUrl(this.assetBaseUrl(), this.variant().baselinePath)
  );
  private readonly currentUrl = computed(() =>
    resolveAssetUrl(this.assetBaseUrl(), this.variant().currentPath)
  );
  protected readonly diffUrl = computed(() =>
    resolveAssetUrl(this.assetBaseUrl(), this.variant().diffPath)
  );

  /**
   * The two images to compare.
   *
   * `currentPath` is optional in the report, so the right-hand side falls back
   * to the diff mask. Below that the viewer degrades to a single image.
   */
  protected readonly images = computed(() => {
    const left = this.baselineUrl();
    const right = this.currentUrl() ?? this.diffUrl();
    if (!left || !right) return null;
    return {
      left,
      leftLabel: 'Baseline',
      right,
      rightLabel: this.currentUrl() ? 'Current' : 'Diff',
    };
  });

  /**
   * The surface each capture sits on; see {@link shotSurfaceStyle}.
   *
   * The baseline falls back to this run's background: when it did not move the
   * two are the same, and when it did, `baselineBg` is what records the move.
   */
  protected readonly currentSurface = computed(() =>
    shotSurfaceStyle(this.variant().bg)
  );

  protected readonly baselineSurface = computed(() =>
    shotSurfaceStyle(this.variant().baselineBg ?? this.variant().bg)
  );

  /** A background move between baseline and this run; see {@link bgChange}. */
  protected readonly bgMove = computed(() => bgChange(this.variant()));

  protected readonly singleImage = computed(() => {
    if (this.images()) return null;
    const baseline = this.baselineUrl();
    const only = baseline ?? this.currentUrl() ?? this.diffUrl();
    if (!only) return null;
    const isNew = this.variant().status === 'new';
    return {
      src: only,
      surface: baseline ? this.baselineSurface() : this.currentSurface(),
      label: isNew ? 'Current' : 'Recorded image',
      title: isNew ? 'No baseline yet.' : 'Only one image recorded.',
      note: isNew
        ? 'Nothing to compare against — this is what the runner captured.'
        : 'The report recorded only one image for this variant.',
    };
  });

  protected readonly availableModes = computed<CompareMode[]>(() => {
    if (this.variant().status === 'excluded') return [];
    if (!this.images()) return [];

    // Wiping between two images of different sizes overlays pixels that do not
    // correspond, so a resized variant leads with side-by-side. Wipe stays
    // available — it is a poor comparison there, not a forbidden one.
    const modes: CompareMode[] =
      this.variant().status === 'size-mismatch'
        ? ['side-by-side', 'wipe']
        : ['wipe', 'side-by-side'];

    // Only a distinct diff mask earns its own tab; when it is already the
    // right-hand image, a "Diff" button would just repeat the comparison.
    if (this.diffUrl() && this.currentUrl()) modes.push('diff');
    return modes;
  });

  protected readonly activeMode = computed<CompareMode>(() => {
    const available = this.availableModes();
    const requested = this.requestedMode();
    return requested && available.includes(requested)
      ? requested
      : available[0] ?? 'wipe';
  });

  /** Fixed zoom steps need a natural width to multiply; `fit` does not. */
  protected readonly canZoom = computed(
    () => typeof this.variant().width === 'number'
  );

  /**
   * An excluded variant has no modes, no measurements and nothing to zoom, so
   * the bar would render as a bare rule above the note explaining why.
   */
  protected readonly showToolbar = computed(() => {
    const variant = this.variant();
    return (
      this.availableModes().length > 0 ||
      this.canZoom() ||
      variant.diffPixels !== undefined ||
      variant.diffRatio !== undefined
    );
  });

  /** Width declarations for the frame; see {@link frameWidthStyle}. */
  protected readonly frameStyle = computed(() => {
    const { width, height } = this.variant();
    return frameWidthStyle(width, height, this.zoom());
  });

  protected percent(ratio: number): string {
    return formatPercent(ratio);
  }
}
