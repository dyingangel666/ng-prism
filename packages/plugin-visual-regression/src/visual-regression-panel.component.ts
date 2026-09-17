import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  signal,
} from '@angular/core';
import { resolveAssetUrl } from './asset-url.js';
import type {
  VrtComponentMeta,
  VrtStatus,
  VrtVariantResult,
} from './visual-regression.types.js';

type CompareMode = 'wipe' | 'side-by-side' | 'diff';

const STATUS_LABEL: Record<VrtStatus, string> = {
  unchanged: 'Unchanged',
  changed: 'Changed',
  'size-mismatch': 'Resized',
  new: 'New',
  excluded: 'Excluded',
};

@Component({
  selector: 'prism-visual-regression-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (meta(); as m) { @if (m.found) {
    <div class="vrt">
      <ul class="vrt__list">
        @for (row of rows(); track row.key) {
        <li>
          <button
            type="button"
            class="vrt__row"
            [class.vrt__row--active]="row.key === selectedKey()"
            (click)="selectedKey.set(row.key)"
          >
            <span
              class="vrt__dot"
              [attr.data-status]="row.variant.status"
            ></span>
            <span class="vrt__name">{{ row.label }}</span>
            <span class="vrt__status" [attr.data-status]="row.variant.status">{{
              row.statusLabel
            }}</span>
            <span class="vrt__diff">{{ row.diffLabel }}</span>
          </button>
        </li>
        }
      </ul>

      <div class="vrt__viewer">
        @if (selected(); as v) {
        <div class="vrt__toolbar">
          <div class="vrt__modes">
            @for (mode of availableModes(); track mode) {
            <button
              type="button"
              class="vrt__mode"
              [class.vrt__mode--active]="mode === activeMode()"
              (click)="requestedMode.set(mode)"
            >
              {{ modeLabel(mode) }}
            </button>
            }
          </div>
          <span class="vrt__meta">
            @if (v.width && v.height) { {{ v.width }}×{{ v.height }} } @if
            (v.diffPixels !== undefined) { · {{ v.diffPixels.toLocaleString() }}
            px }
          </span>
        </div>

        @if (v.status === 'size-mismatch') {
        <p class="vrt__note">
          Dimensions changed, so no pixel comparison was possible. Compare the
          images directly.
        </p>
        } @if (v.status === 'excluded') {
        <p class="vrt__note">
          Excluded from visual regression, so nothing was captured.@if
          (v.reason) { <span class="vrt__reason">{{ v.reason }}</span> }
        </p>
        } @else if (images(); as img) { @switch (activeMode()) { @case ('wipe')
        {
        <div class="vrt__stage">
          <div class="vrt__wipe">
            <img class="vrt__img" [src]="img.left" [alt]="img.leftLabel" />
            <div
              class="vrt__wipe-top"
              [style.clip-path]="'inset(0 0 0 ' + wipe() + '%)'"
            >
              <img class="vrt__img" [src]="img.right" [alt]="img.rightLabel" />
            </div>
            <div class="vrt__wipe-handle" [style.left.%]="wipe()"></div>
          </div>
          <input
            class="vrt__slider"
            type="range"
            min="0"
            max="100"
            aria-label="Comparison position"
            [value]="wipe()"
            (input)="wipe.set(+$any($event.target).value)"
          />
          <div class="vrt__legend">
            <span>{{ img.leftLabel }}</span>
            <span>{{ img.rightLabel }}</span>
          </div>
        </div>
        } @case ('side-by-side') {
        <div class="vrt__stage vrt__stage--split">
          <figure>
            <figcaption>{{ img.leftLabel }}</figcaption>
            <img class="vrt__img" [src]="img.left" [alt]="img.leftLabel" />
          </figure>
          <figure>
            <figcaption>{{ img.rightLabel }}</figcaption>
            <img class="vrt__img" [src]="img.right" [alt]="img.rightLabel" />
          </figure>
        </div>
        } @case ('diff') {
        <div class="vrt__stage">
          <img class="vrt__img" [src]="diffUrl()" alt="Pixel diff" />
        </div>
        } } } @else if (singleImage(); as single) {
        <div class="vrt__stage">
          <p class="vrt__note">{{ single.note }}</p>
          <img class="vrt__img" [src]="single.src" [alt]="single.label" />
        </div>
        } @else {
        <p class="vrt__note">
          No images recorded for this variant. The report contains its result
          but no file paths.
        </p>
        } } @else {
        <p class="vrt__note">Select a variant.</p>
        }
      </div>
    </div>
    } @else {
    <p class="vrt__empty">
      No visual regression results for this component. Run your screenshot
      runner and rebuild the styleguide.
    </p>
    } } @else {
    <p class="vrt__empty">
      No visual regression report loaded. Check the plugin's
      <code>reportPath</code>.
    </p>
    }
  `,
  styles: `
    :host {
      display: block;
      height: 100%;
      font-size: 13px;
      color: var(--prism-text);
    }

    .vrt {
      display: grid;
      grid-template-columns: minmax(200px, 280px) 1fr;
      height: 100%;
      min-height: 0;
    }

    .vrt__list {
      margin: 0;
      padding: 0;
      list-style: none;
      overflow-y: auto;
      border-right: 1px solid var(--prism-border);
    }

    .vrt__row {
      display: grid;
      grid-template-columns: auto 1fr auto auto;
      align-items: center;
      gap: 8px;
      width: 100%;
      padding: 7px 12px;
      background: none;
      border: none;
      border-bottom: 1px solid var(--prism-border);
      color: inherit;
      font: inherit;
      text-align: left;
      cursor: pointer;
    }
    .vrt__row:hover { background: var(--prism-bg-hover, rgba(127,127,127,0.08)); }
    .vrt__row--active { background: var(--prism-bg-active, rgba(127,127,127,0.14)); }

    .vrt__dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--prism-text-ghost);
    }
    .vrt__name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .vrt__status {
      font-size: var(--fs-xs);
      color: var(--prism-text-muted);
    }
    .vrt__diff {
      font-family: var(--font-mono);
      font-size: var(--fs-xs);
      color: var(--prism-text-muted);
      min-width: 48px;
      text-align: right;
    }

    [data-status='unchanged'].vrt__dot { background: var(--prism-success); }
    [data-status='changed'].vrt__dot { background: var(--prism-danger); }
    [data-status='size-mismatch'].vrt__dot { background: var(--prism-warn); }
    [data-status='new'].vrt__dot { background: var(--prism-text-ghost); }
    [data-status='excluded'].vrt__dot { background: var(--prism-border-strong); }

    [data-status='unchanged'].vrt__status { color: var(--prism-success); }
    [data-status='changed'].vrt__status { color: var(--prism-danger); }
    [data-status='size-mismatch'].vrt__status { color: var(--prism-warn); }
    [data-status='excluded'].vrt__status { color: var(--prism-text-muted); }

    .vrt__reason {
      display: block;
      margin-top: 6px;
      color: var(--prism-text-muted);
    }

    .vrt__viewer {
      display: flex;
      flex-direction: column;
      min-width: 0;
      min-height: 0;
      overflow: auto;
      padding: 10px 14px;
      gap: 10px;
    }

    .vrt__toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
    }

    .vrt__modes { display: inline-flex; gap: 4px; }

    .vrt__mode {
      padding: 3px 10px;
      border-radius: 6px;
      border: 1px solid var(--prism-border);
      background: var(--prism-input-bg);
      color: var(--prism-text-muted);
      font: inherit;
      font-size: var(--fs-xs);
      cursor: pointer;
    }
    .vrt__mode--active {
      color: var(--prism-text);
      border-color: color-mix(in srgb, var(--prism-primary) 45%, transparent);
      background: color-mix(in srgb, var(--prism-primary) 14%, transparent);
    }

    .vrt__meta {
      font-family: var(--font-mono);
      font-size: var(--fs-xs);
      color: var(--prism-text-muted);
    }

    .vrt__stage {
      display: flex;
      flex-direction: column;
      /* Without this the wipe box stretches to the full panel width and the
         comparison slider maps onto empty space instead of the image. */
      align-items: flex-start;
      gap: 8px;
      min-width: 0;
    }
    .vrt__stage--split {
      flex-direction: row;
      gap: 16px;
      align-items: flex-start;
      overflow-x: auto;
    }
    .vrt__stage--split figure { margin: 0; min-width: 0; }
    .vrt__stage--split figcaption {
      font-size: var(--fs-xs);
      color: var(--prism-text-muted);
      margin-bottom: 4px;
    }

    .vrt__wipe {
      position: relative;
      display: inline-block;
      max-width: 100%;
      /* A checkerboard makes transparent regions of a PNG legible. */
      background-image:
        linear-gradient(45deg, var(--prism-border) 25%, transparent 25%),
        linear-gradient(-45deg, var(--prism-border) 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, var(--prism-border) 75%),
        linear-gradient(-45deg, transparent 75%, var(--prism-border) 75%);
      background-size: 12px 12px;
      background-position: 0 0, 0 6px, 6px -6px, -6px 0;
    }
    .vrt__wipe-top {
      position: absolute;
      inset: 0;
    }
    .vrt__wipe-handle {
      position: absolute;
      top: 0;
      bottom: 0;
      width: 1px;
      background: var(--prism-primary);
      pointer-events: none;
    }

    .vrt__img {
      display: block;
      max-width: 100%;
      image-rendering: pixelated;
    }

    .vrt__slider { width: 100%; min-width: 220px; max-width: 420px; align-self: stretch; }

    .vrt__legend {
      display: flex;
      justify-content: space-between;
      align-self: stretch;
      max-width: 420px;
      font-size: var(--fs-xs);
      color: var(--prism-text-muted);
    }

    .vrt__note,
    .vrt__empty {
      margin: 0;
      color: var(--prism-text-muted);
      font-size: 13px;
    }
    .vrt__empty { padding: 24px; text-align: center; }
  `,
})
export class VisualRegressionPanelComponent {
  readonly activeComponent = input<unknown>(null);

  protected readonly requestedMode = signal<CompareMode | null>(null);
  protected readonly wipe = signal(50);
  protected readonly selectedKey = signal<string | null>(null);

  protected readonly meta = computed<VrtComponentMeta | null>(() => {
    const comp = this.activeComponent() as {
      meta?: { showcaseConfig?: { meta?: Record<string, unknown> } };
    } | null;
    return (
      (comp?.meta?.showcaseConfig?.meta?.['visualRegression'] as
        | VrtComponentMeta
        | undefined) ?? null
    );
  });

  private readonly assetBaseUrl = computed(
    () => this.meta()?.assetBaseUrl ?? ''
  );

  protected readonly rows = computed(() =>
    (this.meta()?.variants ?? []).map((variant) => ({
      key: `${variant.className}:${variant.variantIndex}`,
      variant,
      label:
        variant.variantName ??
        variant.title ??
        `Variant ${variant.variantIndex}`,
      statusLabel: STATUS_LABEL[variant.status],
      diffLabel: formatDiff(variant),
    }))
  );

  protected readonly selected = computed<VrtVariantResult | null>(() => {
    const rows = this.rows();
    if (!rows.length) return null;
    const key = this.selectedKey();
    // Default to the first variant that actually changed — that is what someone
    // opening this panel came to look at.
    return (
      rows.find((r) => r.key === key)?.variant ??
      rows.find((r) => r.variant.status === 'changed')?.variant ??
      rows[0].variant
    );
  });

  private readonly baselineUrl = computed(() =>
    resolveAssetUrl(this.assetBaseUrl(), this.selected()?.baselinePath)
  );
  private readonly currentUrl = computed(() =>
    resolveAssetUrl(this.assetBaseUrl(), this.selected()?.currentPath)
  );
  protected readonly diffUrl = computed(() =>
    resolveAssetUrl(this.assetBaseUrl(), this.selected()?.diffPath)
  );

  /**
   * The two images to compare.
   *
   * `currentPath` is optional in the report, so the right-hand side falls back
   * to the diff mask. Below/above that the viewer degrades to a single image.
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

  protected readonly singleImage = computed(() => {
    if (this.images()) return null;
    const only = this.baselineUrl() ?? this.currentUrl() ?? this.diffUrl();
    if (!only) return null;
    const isNew = this.selected()?.status === 'new';
    return {
      src: only,
      label: isNew ? 'Current' : 'Recorded image',
      note: isNew
        ? 'No baseline yet — this variant has nothing to compare against.'
        : 'Only one image was recorded for this variant.',
    };
  });

  protected readonly availableModes = computed<CompareMode[]>(() => {
    if (this.selected()?.status === 'excluded') return [];
    if (!this.images()) return [];
    const modes: CompareMode[] = ['wipe', 'side-by-side'];
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

  protected modeLabel(mode: CompareMode): string {
    return mode === 'wipe'
      ? 'Wipe'
      : mode === 'side-by-side'
      ? 'Side by side'
      : 'Diff';
  }
}

function formatDiff(variant: VrtVariantResult): string {
  if (variant.status === 'new' || variant.status === 'excluded') return '—';
  if (variant.diffRatio === undefined) return '';
  const pct = variant.diffRatio * 100;
  if (pct === 0) return '0%';
  if (pct < 0.01) return '<0.01%';
  return `${pct.toFixed(2)}%`;
}
