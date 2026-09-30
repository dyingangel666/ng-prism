import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { formatPercent, summarySegments, type VrtSummary } from './vrt-summarize.js';

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
    templateUrl: './vrt-summary.component.html',
    styleUrl: './vrt-summary.component.css'
})
export class VrtSummaryComponent {
    readonly summary = input.required<VrtSummary>();

    protected readonly segments = computed(() => summarySegments(this.summary()));

    protected readonly maxDiff = computed(() => {
        const ratio = this.summary().maxDiffRatio;
        if (ratio === null) return null;
        return {
            value: formatPercent(ratio),
            tone: ratio > 0 ? 'danger' : 'success'
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
