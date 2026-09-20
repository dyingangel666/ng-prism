import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import {
  formatPercent,
  summarySegments,
  type VrtSummary,
} from './vrt-summarize.js';

/**
 * The run's headline, sitting above the variant list.
 *
 * It lives in the 250px column rather than in a band across the panel, and
 * that placement is the whole design. This panel docks at the bottom of the
 * app at 260px by default, which leaves ~228px inside it; a full-width summary
 * strip took ~89px of that before the comparison had rendered a single pixel.
 * In the narrow column it costs the variant list about one row and costs the
 * image nothing — and the image is what the panel is for.
 *
 * The cost of that is precision, so the split is deliberate: the bar carries
 * the *composition* (which statuses, in what proportion) where a glance is
 * enough, and the line under it carries the one figure a reviewer acts on.
 * Exact per-status counts live one place over, in the grouped list below,
 * whose headers already read "Needs review · 1" and "Unchanged · 14" —
 * restating them here would be the tile strip again, in a narrower column.
 * The line therefore disappears entirely when nothing could be compared,
 * rather than printing a dash under a bar that already says so.
 */
@Component({
  selector: 'prism-vrt-summary',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="vrt-sum">
      <div class="vrt-sum__bar" role="img" [attr.aria-label]="barLabel()">
        @for (segment of segments(); track segment.key) {
        <div
          class="vrt-sum__seg"
          [attr.data-tone]="segment.tone"
          [style.flex-grow]="segment.count"
          [title]="segment.label + ': ' + segment.count"
        ></div>
        }
      </div>

      @if (maxDiff(); as max) {
      <div class="vrt-sum__line">
        <span class="vrt-sum__stat">
          max <b [attr.data-tone]="max.tone">{{ max.value }}</b>
        </span>
      </div>
      }
    </div>
  `,
  styles: `
    :host { display: block; }

    .vrt-sum__bar {
      display: flex;
      gap: 1px;
      height: 6px;
      border-radius: 3px;
      overflow: hidden;
      background: var(--prism-input-bg);
    }
    /* flex-basis 0 so a slice's width comes from its count alone — with the
       default of auto an empty div still claims its content box and every
       segment would render the same width. */
    .vrt-sum__seg {
      flex-basis: 0;
      background: var(--tone-color, var(--prism-text-muted));
      transition: flex-grow var(--dur-slow) var(--ease-default);
    }

    .vrt-sum__line {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 8px;
      margin-top: 9px;
      font-family: var(--font-mono);
      font-size: var(--fs-sm);
      color: var(--prism-text-muted);
    }
    .vrt-sum__stat { white-space: nowrap; }
    .vrt-sum__line b {
      font-weight: 700;
      color: var(--tone-color, var(--prism-text));
    }

    [data-tone='success'] { --tone-color: var(--prism-success); }
    [data-tone='danger'] { --tone-color: var(--prism-danger); }
    [data-tone='warn'] { --tone-color: var(--prism-warn); }
    [data-tone='neutral'] { --tone-color: var(--prism-primary); }
    [data-tone='muted'] { --tone-color: var(--prism-text-muted); }
  `,
})
export class VrtSummaryComponent {
  readonly summary = input.required<VrtSummary>();

  protected readonly segments = computed(() => summarySegments(this.summary()));

  protected readonly maxDiff = computed(() => {
    const ratio = this.summary().maxDiffRatio;
    if (ratio === null) return null;
    return {
      value: formatPercent(ratio),
      tone: ratio > 0 ? 'danger' : 'success',
    };
  });

  /**
   * The bar's content as a sentence.
   *
   * The slices are the only place the per-status breakdown is shown, and they
   * are colour and proportion — nothing a screen reader can read. Each slice
   * carries a `title` for a pointer; this carries the same thing for everyone
   * else.
   */
  protected readonly barLabel = computed(() =>
    this.segments().length === 0
      ? 'No variants'
      : this.segments()
          .map((segment) => `${segment.count} ${segment.label.toLowerCase()}`)
          .join(', ')
  );
}
