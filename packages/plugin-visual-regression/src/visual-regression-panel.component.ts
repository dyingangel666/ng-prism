import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  signal,
} from '@angular/core';
import { VrtCompareComponent } from './vrt-compare.component.js';
import { VrtSummaryComponent } from './vrt-summary.component.js';
import {
  defaultExpandedGroups,
  formatPercent,
  groupRows,
  STATUS_LABEL,
  STATUS_TONE,
  summarize,
  type VrtGroupKey,
} from './vrt-summarize.js';
import type {
  VrtComponentMeta,
  VrtVariantResult,
} from './visual-regression.types.js';

@Component({
  selector: 'prism-visual-regression-panel',
  standalone: true,
  imports: [VrtCompareComponent, VrtSummaryComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (meta(); as m) { @if (m.found) {
    <div class="vrt">
      <div class="vrt__aside">
        <div class="vrt__summary">
          <prism-vrt-summary [summary]="summary()" />
        </div>

        <div class="vrt__list">
          @for (group of groups(); track group.key) { @if (group.collapsible) {
          <button
            type="button"
            class="vrt__group vrt__group--toggle"
            [attr.aria-expanded]="isExpanded(group.key)"
            (click)="toggleGroup(group.key)"
          >
            <span class="vrt__group-label"
              >{{ group.label }} · {{ group.count }}</span
            >
            <span
              class="vrt__caret"
              [class.vrt__caret--open]="isExpanded(group.key)"
              aria-hidden="true"
              >&#9654;</span
            >
          </button>
          } @else {
          <p class="vrt__group">
            <span class="vrt__group-label"
              >{{ group.label }} · {{ group.count }}</span
            >
          </p>
          } @if (!group.collapsible || isExpanded(group.key)) {
          <ul class="vrt__rows">
            @for (row of group.rows; track row.key) {
            <li>
              <button
                type="button"
                class="vrt__row"
                [attr.data-tone]="row.tone"
                [class.vrt__row--active]="row.variant === selected()"
                (click)="selectedKey.set(row.key)"
              >
                <span class="vrt__name">{{ row.label }}</span>
                <span class="vrt__status">{{ row.statusLabel }}</span>
                <span class="vrt__diff">{{ row.diffLabel }}</span>
              </button>
            </li>
            }
          </ul>
          } }
        </div>
      </div>

      <div class="vrt__viewer">
        @if (selected(); as v) {
        <prism-vrt-compare [variant]="v" [assetBaseUrl]="assetBaseUrl()" />
        } @else {
        <p class="vrt__empty">Select a variant.</p>
        }
      </div>
    </div>
    } @else {
    <div class="vrt__empty">
      <b>No visual regression results for this component.</b>
      <span>Run your screenshot runner and rebuild the styleguide.</span>
    </div>
    } } @else {
    <div class="vrt__empty">
      <b>No visual regression report loaded.</b>
      <span>Check the plugin's <code>reportPath</code>.</span>
    </div>
    }
  `,
  styles: `
    /*
     * Not a scroll container.
     *
     * It used to be overflow:auto, which made the whole panel one scroller:
     * both columns simply grew and the panel scrolled as a unit, so picking a
     * variant further down the list scrolled the comparison off the top and
     * you had to scroll back up to see what you had picked. The two columns
     * own their scrolling now, and the chain of min-height:0 below is what
     * lets them — a grid or flex item defaults to min-height:auto, refuses
     * to shrink below its content, and pushes the overflow back up here.
     */
    :host {
      display: block;
      height: 100%;
      overflow: hidden;
      font-size: var(--fs-md);
      color: var(--prism-text);
    }

    .vrt {
      display: grid;
      grid-template-columns: minmax(200px, 250px) 1fr;
      height: 100%;
      min-height: 0;
    }

    .vrt__aside {
      display: flex;
      flex-direction: column;
      min-height: 0;
      min-width: 0;
    }

    .vrt__summary {
      flex: none;
      padding: 12px 12px 11px 16px;
      border-bottom: 1px solid var(--prism-border);
    }

    .vrt__list {
      flex: 1;
      min-height: 0;
      overflow: auto;
      margin: 0;
      padding: 12px 4px 12px 16px;
    }

    .vrt__rows {
      margin: 0 0 2px;
      padding: 0;
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    /* The group header, in both its forms: a paragraph for the group that
       cannot collapse and a button for the ones that can, so the disclosure is
       a real control rather than a click handler on a label — same box either
       way, which is what keeps the two from jumping as groups appear. */
    .vrt__group {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      width: 100%;
      margin: 0;
      padding: 10px 8px 6px;
      background: none;
      border: none;
      color: inherit;
      font: inherit;
      text-align: left;
    }
    .vrt__group--toggle { cursor: pointer; }
    .vrt__group--toggle:hover .vrt__group-label { color: var(--prism-text-2); }

    .vrt__group-label {
      font-size: var(--fs-sm);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--prism-text-muted);
      transition: color var(--dur-fast);
    }

    .vrt__caret {
      font-size: 9px;
      line-height: 1;
      color: var(--prism-text-ghost);
      transition: transform var(--dur-fast) var(--ease-default);
    }
    .vrt__caret--open { transform: rotate(90deg); }

    /* Same card-with-severity-edge as the a11y violations list, so the two
       panels read as one product. */
    .vrt__row {
      display: grid;
      grid-template-columns: 1fr auto;
      grid-template-areas: 'name diff' 'status diff';
      align-items: center;
      gap: 0 10px;
      width: 100%;
      padding: 8px 11px;
      background: var(--prism-bg-surface);
      border: 1px solid var(--prism-border);
      border-left: 3px solid var(--tone-color, var(--prism-border-strong));
      border-radius: var(--radius-md);
      color: inherit;
      font: inherit;
      text-align: left;
      cursor: pointer;
      transition: border-color var(--dur-fast), background var(--dur-fast);
    }
    .vrt__row:hover { border-color: var(--prism-border-strong); }
    .vrt__row:hover { border-left-color: var(--tone-color, var(--prism-border-strong)); }
    .vrt__row--active {
      background: color-mix(in srgb, var(--prism-primary) 10%, var(--prism-bg-surface));
      border-color: color-mix(in srgb, var(--prism-primary) 40%, transparent);
      border-left-color: var(--tone-color, var(--prism-primary));
    }

    .vrt__name {
      grid-area: name;
      font-weight: 600;
      font-size: var(--fs-md);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .vrt__status {
      grid-area: status;
      justify-self: start;
      margin-top: 3px;
      font-family: var(--font-mono);
      font-size: 9.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 2px 6px;
      border-radius: var(--radius-xs);
      background: color-mix(in srgb, var(--tone-color) 15%, transparent);
      color: var(--tone-color);
    }

    .vrt__diff {
      grid-area: diff;
      font-family: var(--font-mono);
      font-size: var(--fs-sm);
      color: var(--prism-text-muted);
      white-space: nowrap;
    }

    [data-tone='success'] { --tone-color: var(--prism-success); }
    [data-tone='danger'] { --tone-color: var(--prism-danger); }
    [data-tone='warn'] { --tone-color: var(--prism-warn); }
    [data-tone='neutral'] { --tone-color: var(--prism-primary); }
    [data-tone='muted'] { --tone-color: var(--prism-text-muted); }

    .vrt__viewer {
      min-width: 0;
      min-height: 0;
      overflow: auto;
      border-left: 1px solid var(--prism-border);
    }

    .vrt__empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 4px;
      min-height: 140px;
      padding: 24px;
      text-align: center;
      font-size: var(--fs-md);
    }
    .vrt__empty b { font-weight: 600; color: var(--prism-text-2); }
    .vrt__empty span { color: var(--prism-text-muted); }
    .vrt__empty code {
      font-family: var(--font-mono);
      font-size: var(--fs-sm);
      padding: 1px 5px;
      border-radius: var(--radius-xs);
      background: var(--prism-input-bg);
    }

    /* Too narrow for two columns: stack them, and hand the scrolling back to
       the panel as a whole — side by side the two scrollers keep the list and
       the image in view at once, stacked there is nothing to keep in view. */
    @media (max-width: 860px) {
      :host { overflow: auto; }
      .vrt { grid-template-columns: 1fr; height: auto; }
      .vrt__list { overflow: visible; padding-right: 16px; }
      .vrt__viewer {
        overflow: visible;
        border-left: none;
        border-top: 1px solid var(--prism-border);
      }
    }
  `,
})
export class VisualRegressionPanelComponent {
  readonly activeComponent = input<unknown>(null);

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

  protected readonly assetBaseUrl = computed(
    () => this.meta()?.assetBaseUrl ?? ''
  );

  private readonly variants = computed(() => this.meta()?.variants ?? []);

  protected readonly summary = computed(() => summarize(this.variants()));

  protected readonly rows = computed(() =>
    this.variants().map((variant) => ({
      key: `${variant.className}:${variant.variantIndex}`,
      variant,
      status: variant.status,
      label:
        variant.variantName ??
        variant.title ??
        `Variant ${variant.variantIndex}`,
      statusLabel: STATUS_LABEL[variant.status] ?? variant.status,
      tone: STATUS_TONE[variant.status] ?? 'muted',
      diffLabel: formatDiff(variant),
    }))
  );

  protected readonly groups = computed(() => groupRows(this.rows()));

  /**
   * Which groups the reader has opened.
   *
   * `null` means "nobody has touched this yet", which is what lets the default
   * follow the data — shut while something needs review, the first group open
   * when nothing does. A plain set initialised once would freeze the first
   * component's answer and apply it to every component after it.
   */
  private readonly expanded = signal<ReadonlySet<VrtGroupKey> | null>(null);

  private readonly expandedGroups = computed<ReadonlySet<VrtGroupKey>>(
    () => this.expanded() ?? new Set(defaultExpandedGroups(this.groups()))
  );

  protected isExpanded(key: VrtGroupKey): boolean {
    return this.expandedGroups().has(key);
  }

  protected toggleGroup(key: VrtGroupKey): void {
    const next = new Set(this.expandedGroups());
    if (!next.delete(key)) next.add(key);
    this.expanded.set(next);
  }

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
}

function formatDiff(variant: VrtVariantResult): string {
  if (variant.diffRatio === undefined) return '—';
  return formatPercent(variant.diffRatio);
}
