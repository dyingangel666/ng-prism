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
      <ng-content select="[headEnd]" />
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

    .comp-crumb {
      font-size: var(--fs-xs);
      color: var(--prism-text-ghost);
      letter-spacing: 0.06em;
      text-transform: uppercase;
      white-space: nowrap;
    }
    .comp-crumb::after { content: ' /'; }

    .comp-title {
      margin: 0;
      font-size: var(--fs-xl);
      font-weight: 600;
      letter-spacing: -0.015em;
      color: var(--prism-text);
      white-space: nowrap;
    }

    .comp-spacer { flex: 1; }

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
    .comp-status--stable { color: var(--prism-text-muted); }
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

  protected readonly bundleSize = computed<string | null>(() => {
    const meta = this.componentMeta();
    const perf = meta?.['perf'] as Record<string, unknown> | undefined;
    const bundle = perf?.['bundle'] as Record<string, unknown> | undefined;
    if (bundle && typeof bundle['gzipKb'] === 'number')
      return bundle['gzipKb'] + ' kb';
    if (bundle && typeof bundle['sizeKb'] === 'number')
      return bundle['sizeKb'] + ' kb';
    return null;
  });

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
    const bundle = this.bundleSize();

    return [
      {
        id: 'variants',
        label: 'Variants',
        value: String(this.variantCount()),
        variant: this.variantCount() > 0 ? 'ok' : 'none',
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
      {
        id: 'bundle',
        label: 'Bundle',
        value: bundle ?? '—',
        variant: bundle === null ? 'none' : 'ok',
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
