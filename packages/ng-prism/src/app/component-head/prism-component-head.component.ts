import {
  Component,
  inject,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { PrismNavigationService } from '../services/prism-navigation.service.js';
import { A11yAuditService } from '../panels/a11y/a11y-audit.service.js';
import { PrismHeadInfoComponent } from './prism-head-info.component.js';
import { PrismHeadGaugeComponent } from './prism-head-gauge.component.js';
import type { HeadMetric } from './head-metrics.js';
import type { ComponentStatus } from '../../decorator/showcase.types.js';

interface StatusBadge {
  label: string;
  tooltip: string;
}

const STATUS_BADGES: Record<ComponentStatus, StatusBadge> = {
  stable: {
    label: 'Stable',
    tooltip: 'Migrated and production-ready',
  },
  beta: {
    label: 'Beta',
    tooltip: 'Beta — API may change',
  },
  wip: {
    label: 'Work in progress',
    tooltip: 'Migration in progress',
  },
  deprecated: {
    label: 'Deprecated',
    tooltip: 'Deprecated / Legacy — do not use in new code',
  },
};

@Component({
  selector: 'prism-component-head',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrismHeadInfoComponent, PrismHeadGaugeComponent],
  template: `
    @if (comp(); as c) {
    <section class="comp-head">
      <span class="comp-crumb">{{ category() }}</span>
      <h1 class="comp-title">{{ c.meta.showcaseConfig.title }}</h1>

      <prism-head-info
        [selector]="c.meta.componentMeta.selector"
        [description]="c.meta.showcaseConfig.description"
        [tags]="c.meta.showcaseConfig.tags ?? []"
      />

      @if (statusBadge(); as badge) {
      <span
        class="comp-status comp-status--{{ status() }}"
        [attr.title]="badge.tooltip"
      >
        <span class="comp-status-mark" aria-hidden="true"></span>
        {{ badge.label }}
      </span>
      }

      <span class="comp-spacer"></span>

      <prism-head-gauge [metrics]="metrics()" />
      <span class="comp-head-end"><ng-content select="[headEnd]" /></span>
    </section>
    }
  `,
  styles: `
    :host { display: block; flex-shrink: 0; }

    .comp-head {
      height: var(--band-head);
      display: flex;
      align-items: center;
      gap: var(--sp-3);
      padding: 0 var(--sp-5);
      background: var(--prism-bg);
      border-bottom: 1px solid var(--prism-border);
    }

    /* The text yields, the controls never do. A long category and a long title
       would otherwise push the gauge out of a fixed-height row whose ancestors
       clip — making the measurement unreachable in exactly the case where you
       most want to read it, and costing the gauge the fixed position it was
       designed around. The trade is deliberate: a title truncated with an
       ellipsis, so the chip stays put at the right edge. The crumb gives way
       first, being the least important text in the row. */
    .comp-crumb {
      flex: 0 8 auto;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      font-size: var(--fs-xs);
      color: var(--prism-text-ghost);
      letter-spacing: 0.06em;
      text-transform: uppercase;
      white-space: nowrap;
    }
    .comp-crumb::after { content: ' /'; }

    .comp-title {
      flex: 0 1 auto;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      margin: 0;
      font-size: var(--fs-xl);
      font-weight: 600;
      letter-spacing: -0.015em;
      color: var(--prism-text);
      white-space: nowrap;
    }

    .comp-spacer { flex: 1; }

    .comp-status,
    prism-head-info,
    prism-head-gauge,
    .comp-head-end { flex: none; }

    /* Wraps the slot rather than styling the projected element, which this
       stylesheet cannot reach. :empty keeps the row's trailing gap from
       appearing when nothing is projected — comment anchors do not count. */
    .comp-head-end { display: inline-flex; align-items: center; }
    .comp-head-end:empty { display: none; }

    /* Always an outline, never a filled surface — deprecated separates itself
       by hue, not by weight. A filled alarm-coloured chip in a permanently
       visible band is exactly the "red as background texture" problem this
       redesign exists to fix. */
    .comp-status {
      display: inline-flex;
      align-items: center;
      gap: var(--sp-2);
      height: 18px;
      padding: 0 var(--sp-3) 0 var(--sp-2);
      border-radius: var(--radius-xs);
      border: 1px solid currentColor;
      font-size: var(--fs-xs);
      font-weight: 600;
      letter-spacing: 0.03em;
      white-space: nowrap;
      color: var(--prism-text-muted);
    }
    .comp-status-mark {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
    }
    .comp-status--stable {
      color: var(--prism-mark-nominal);
      background: color-mix(in srgb, var(--prism-mark-nominal) 10%, transparent);
    }
    .comp-status--beta,
    .comp-status--wip {
      color: var(--prism-mark-attention);
      background: color-mix(in srgb, var(--prism-mark-attention) 10%, transparent);
    }
    .comp-status--wip .comp-status-mark {
      background: transparent;
      border: 1.5px solid currentColor;
      box-sizing: border-box;
      width: 7px;
      height: 7px;
    }
    .comp-status--deprecated {
      color: var(--prism-mark-critical);
      background: color-mix(in srgb, var(--prism-mark-critical) 12%, transparent);
      border-color: color-mix(in srgb, var(--prism-mark-critical) 55%, transparent);
    }
  `,
})
export class PrismComponentHeadComponent {
  private readonly navigationService = inject(PrismNavigationService);
  private readonly auditService = inject(A11yAuditService);

  protected readonly comp = computed(() =>
    this.navigationService.activeComponent()
  );

  protected readonly category = computed(() => {
    const c = this.comp();
    return c?.meta.showcaseConfig.category ?? 'Uncategorized';
  });

  protected readonly variantCount = computed(() => {
    const c = this.comp();
    return c?.meta.showcaseConfig.variants?.length ?? 0;
  });

  protected readonly status = computed<ComponentStatus | undefined>(
    () => this.comp()?.meta.showcaseConfig.status
  );

  protected readonly statusBadge = computed<StatusBadge | null>(() => {
    const s = this.status();
    return s ? STATUS_BADGES[s] : null;
  });

  protected readonly coveragePercent = computed<number | null>(() => {
    const meta = this.componentMeta();
    const coverage = meta?.['coverage'] as Record<string, unknown> | undefined;
    if (coverage?.['found'] && typeof coverage['score'] === 'number')
      return coverage['score'];
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
    const vrt = this.componentMeta()?.['visualRegression'] as
      | { found?: boolean; summary?: { value: string; variant: string } }
      | undefined;
    if (!vrt?.found || !vrt.summary) return null;
    const { value, variant } = vrt.summary;
    return variant === 'ok' || variant === 'warn' || variant === 'danger'
      ? { value, variant }
      : null;
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
        // Always 'none': a count has no threshold to pass, so it gets no
        // verdict colour and does not inflate the gauge's tally of metrics
        // that are within theirs.
        id: 'variants',
        label: 'Variants',
        value: this.variantCount() > 0 ? String(this.variantCount()) : '—',
        variant: 'none',
      },
      {
        id: 'coverage',
        label: 'Coverage',
        value: coverage === null ? '—' : `${coverage}%`,
        variant: coverage === null ? 'none' : coverage >= 90 ? 'ok' : 'warn',
      },
      {
        id: 'a11y',
        label: 'A11y score',
        value: a11y === null ? '—' : String(a11y),
        variant: a11y === null ? 'none' : a11y >= 90 ? 'ok' : 'warn',
      },
      {
        id: 'vrt',
        label: 'VRT diff',
        value: vrt === null ? '—' : vrt.value,
        variant: vrt === null ? 'none' : vrt.variant,
      },
    ];
  });

  private readonly componentMeta = computed(() => {
    const c = this.comp();
    const meta = c?.meta.showcaseConfig.meta;
    return meta && typeof meta === 'object'
      ? (meta as Record<string, unknown>)
      : null;
  });
}
