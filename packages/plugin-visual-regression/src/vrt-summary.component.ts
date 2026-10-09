import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { formatPercent, summarySegments, type VrtSummary } from './vrt-summarize.js';

/**
 * The run's headline, sitting above the variant list.
 *
 * Placed in the 250px column, not in a full-width band. The panel docks at
 * 260px by default (~228px inside), and a full-width strip took ~89px of that
 * from the comparison. In the column it costs the variant list about one row
 * and the image nothing.
 *
 * The bar shows the composition (which statuses, in what proportion); the line
 * under it shows the one figure a reviewer acts on. Exact per-status counts
 * are in the grouped list headers below ("Needs review · 1"), so they are not
 * repeated here. The line is hidden when nothing could be compared.
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
     * are colour and proportion, nothing a screen reader can read. Each slice
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
