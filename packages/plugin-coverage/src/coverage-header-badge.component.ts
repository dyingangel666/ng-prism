import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { PRISM_MANIFEST } from '@ng-prism/core/plugin';
import type { RuntimeManifest } from '@ng-prism/core/plugin';
import type { CoverageManifestMeta } from './coverage.types.js';

type Variant = 'ok' | 'warn' | 'danger';

@Component({
  selector: 'prism-coverage-header-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (data(); as d) {
    <span
      class="cov-pill"
      [class.cov-pill--ok]="d.variant === 'ok'"
      [class.cov-pill--warn]="d.variant === 'warn'"
      [class.cov-pill--danger]="d.variant === 'danger'"
      [title]="d.title"
    >
      <span class="cov-pill__dot"></span>
      <span class="cov-pill__label">Coverage</span>
      <span class="cov-pill__value">{{ d.score }}<small>%</small></span>
    </span>
    }
  `,
  styles: `
    :host { display: inline-flex; align-items: center; }

    .cov-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-family: var(--font-mono);
      font-size: var(--fs-xs);
      padding: 2px 10px;
      border-radius: 9999px;
      line-height: 1.4;
      border: 1px solid var(--prism-border);
      background: var(--prism-input-bg);
      color: var(--prism-text-muted);
      white-space: nowrap;
    }

    .cov-pill__dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
    }

    .cov-pill__label {
      color: var(--prism-text-ghost);
      letter-spacing: 0.02em;
    }

    .cov-pill__value {
      color: var(--prism-text);
      font-weight: 600;
    }
    .cov-pill__value small {
      font-size: 9px;
      margin-left: 1px;
      color: var(--prism-text-muted);
      font-weight: 500;
    }

    .cov-pill--ok {
      color: var(--prism-success);
      border-color: color-mix(in srgb, var(--prism-success) 35%, transparent);
      background: color-mix(in srgb, var(--prism-success) 12%, transparent);
    }
    .cov-pill--ok .cov-pill__label,
    .cov-pill--ok .cov-pill__value { color: var(--prism-success); }

    .cov-pill--warn {
      color: var(--prism-warn);
      border-color: color-mix(in srgb, var(--prism-warn) 35%, transparent);
      background: color-mix(in srgb, var(--prism-warn) 12%, transparent);
    }
    .cov-pill--warn .cov-pill__label,
    .cov-pill--warn .cov-pill__value { color: var(--prism-warn); }

    .cov-pill--danger {
      color: var(--prism-danger);
      border-color: color-mix(in srgb, var(--prism-danger) 35%, transparent);
      background: color-mix(in srgb, var(--prism-danger) 12%, transparent);
    }
    .cov-pill--danger .cov-pill__label,
    .cov-pill--danger .cov-pill__value { color: var(--prism-danger); }
  `,
})
export class CoverageHeaderBadgeComponent {
  private readonly manifest = inject<RuntimeManifest>(PRISM_MANIFEST);

  protected readonly data = computed(() => {
    const meta = this.manifest.meta?.['coverage'] as
      | CoverageManifestMeta
      | undefined;
    if (!meta?.total?.found) return null;

    const score = meta.total.score;
    const t = meta.thresholds;
    const avgThreshold = Math.round(
      (t.lines + t.branches + t.functions + t.statements) / 4
    );

    const variant: Variant =
      score >= avgThreshold
        ? 'ok'
        : score >= avgThreshold * 0.75
        ? 'warn'
        : 'danger';

    return {
      score,
      variant,
      title:
        `Library coverage: ${score}% (target ${avgThreshold}%)\n` +
        `Lines ${meta.total.lines.pct}% · ` +
        `Branches ${meta.total.branches.pct}% · ` +
        `Functions ${meta.total.functions.pct}% · ` +
        `Statements ${meta.total.statements.pct}%`,
    };
  });
}
