import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import type { ComponentStatus } from '../../decorator/showcase.types.js';
import { A11yAuditService } from '../panels/a11y/a11y-audit.service.js';
import { PrismNavigationService } from '../services/prism-navigation.service.js';
import type { HeadMetric } from './head-metrics.js';
import { PrismHeadGaugeComponent } from './prism-head-gauge.component.js';
import { PrismHeadInfoComponent } from './prism-head-info.component.js';

interface StatusBadge {
    label: string;
    tooltip: string;
}

const STATUS_BADGES: Record<ComponentStatus, StatusBadge> = {
    stable: {
        label: 'Stable',
        tooltip: 'Migrated and production-ready'
    },
    beta: {
        label: 'Beta',
        tooltip: 'Beta — API may change'
    },
    wip: {
        label: 'Work in progress',
        tooltip: 'Migration in progress'
    },
    deprecated: {
        label: 'Deprecated',
        tooltip: 'Deprecated / Legacy — do not use in new code'
    }
};

@Component({
    selector: 'prism-component-head',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [PrismHeadInfoComponent, PrismHeadGaugeComponent],
    templateUrl: './prism-component-head.component.html',
    styleUrl: './prism-component-head.component.css'
})
export class PrismComponentHeadComponent {
    private readonly navigationService = inject(PrismNavigationService);
    private readonly auditService = inject(A11yAuditService);

    protected readonly comp = computed(() => this.navigationService.activeComponent());

    protected readonly category = computed(() => {
        const c = this.comp();

        return c?.meta.showcaseConfig.category ?? 'Uncategorized';
    });

    protected readonly variantCount = computed(() => {
        const c = this.comp();

        return c?.meta.showcaseConfig.variants?.length ?? 0;
    });

    protected readonly status = computed<ComponentStatus | undefined>(() => this.comp()?.meta.showcaseConfig.status);

    protected readonly statusBadge = computed<StatusBadge | null>(() => {
        const s = this.status();

        return s ? STATUS_BADGES[s] : null;
    });

    protected readonly coveragePercent = computed<number | null>(() => {
        const meta = this.componentMeta();
        const coverage = meta?.['coverage'] as Record<string, unknown> | undefined;

        if (coverage?.['found'] && typeof coverage['score'] === 'number') return coverage['score'];
        return null;
    });

    /*
     * There is deliberately no bundle metric here.
     *
     * The computed that used to produce one read `meta.perf.bundle.gzipKb` and
     * `.sizeKb`. `@ng-prism/plugin-perf` writes neither: `bundle-scanner.ts`
     * stores `sourceSize` and `gzipEstimate`, and `perf.types.ts` declares only
     * those two. So the value was always null, and the old head simply hid the
     * tile — a gauge row reading `Bundle —` on every component is noise, not
     * information.
     *
     * Do not re-add the read against the real key names without first settling
     * whether `gzipEstimate` is bytes or kilobytes. The old code appended ' kb'
     * to whatever it found, and that question belongs to the perf plugin, not
     * to the head.
     */

    protected readonly a11yScore = computed<number | null>(() => {
        return this.auditService.scoreResult()?.score ?? null;
    });

    /**
     * The visual regression headline, as the plugin already derived it.
     *
     * Read whole rather than recomputed: the colour follows the plugin's status
     * semantics — red for any changed variant, amber for ones that could not be
     * compared — and duplicating that rule here would mean the stat and the
     * plugin's own panel could disagree about the same component.
     */
    protected readonly vrtStat = computed<{
        value: string;
        variant: 'ok' | 'warn' | 'danger';
    } | null>(() => {
        const vrt = this.componentMeta()?.['visualRegression'] as { found?: boolean; summary?: { value: string; variant: string } } | undefined;

        if (!vrt?.found || !vrt.summary) return null;
        const { value, variant } = vrt.summary;

        return variant === 'ok' || variant === 'warn' || variant === 'danger' ? { value, variant } : null;
    });

    /**
     * The full metric list for the gauge, in source order.
     *
     * Order matters: `summarizeMetrics` breaks severity ties by position, so
     * this sequence is what makes the chip show a stable metric rather than
     * flickering between two equally bad ones.
     */
    protected readonly metrics = computed<HeadMetric[]>(() => {
        const coverage = this.coveragePercent();
        const a11y = this.a11yScore();
        const vrt = this.vrtStat();

        return [
            {
                id: 'coverage',
                label: 'Coverage',
                value: coverage === null ? '—' : `${coverage}%`,
                variant: coverage === null ? 'none' : coverage >= 90 ? 'ok' : 'warn'
            },
            {
                id: 'a11y',
                label: 'A11y score',
                value: a11y === null ? '—' : String(a11y),
                variant: a11y === null ? 'none' : a11y >= 90 ? 'ok' : 'warn'
            },
            {
                id: 'vrt',
                label: 'VRT diff',
                value: vrt === null ? '—' : vrt.value,
                variant: vrt === null ? 'none' : vrt.variant
            }
        ];
    });

    private readonly componentMeta = computed(() => {
        const c = this.comp();
        const meta = c?.meta.showcaseConfig.meta;

        return meta && typeof meta === 'object' ? (meta as Record<string, unknown>) : null;
    });
}
