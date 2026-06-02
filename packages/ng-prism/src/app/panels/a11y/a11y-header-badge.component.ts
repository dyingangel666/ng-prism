import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { PRISM_CONFIG, PRISM_MANIFEST } from '../../tokens/prism-tokens.js';
import type {
  NgPrismConfig,
  RuntimeManifest,
} from '../../../plugin/plugin.types.js';
import { resolveA11yThresholds } from './a11y-thresholds.js';
import type { A11yManifestMeta, A11yThresholds } from './a11y.types.js';

type Variant = 'ok' | 'warn' | 'danger';

@Component({
  selector: 'prism-a11y-header-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (data(); as d) {
    <span
      class="a11y-pill"
      [class.a11y-pill--ok]="d.variant === 'ok'"
      [class.a11y-pill--warn]="d.variant === 'warn'"
      [class.a11y-pill--danger]="d.variant === 'danger'"
      [title]="d.title"
    >
      <span class="a11y-pill__dot"></span>
      <span class="a11y-pill__label">A11y</span>
      <span class="a11y-pill__value">{{ d.score }}<small>%</small></span>
    </span>
    }
  `,
  styles: `
    :host { display: inline-flex; align-items: center; }

    .a11y-pill {
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

    .a11y-pill__dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
    }

    .a11y-pill__label {
      color: var(--prism-text-ghost);
      letter-spacing: 0.02em;
    }

    .a11y-pill__value {
      color: var(--prism-text);
      font-weight: 600;
    }
    .a11y-pill__value small {
      font-size: 9px;
      margin-left: 1px;
      color: var(--prism-text-muted);
      font-weight: 500;
    }

    .a11y-pill--ok {
      color: var(--prism-success);
      border-color: color-mix(in srgb, var(--prism-success) 35%, transparent);
      background: color-mix(in srgb, var(--prism-success) 12%, transparent);
    }
    .a11y-pill--ok .a11y-pill__label,
    .a11y-pill--ok .a11y-pill__value { color: var(--prism-success); }

    .a11y-pill--warn {
      color: var(--prism-warn);
      border-color: color-mix(in srgb, var(--prism-warn) 35%, transparent);
      background: color-mix(in srgb, var(--prism-warn) 12%, transparent);
    }
    .a11y-pill--warn .a11y-pill__label,
    .a11y-pill--warn .a11y-pill__value { color: var(--prism-warn); }

    .a11y-pill--danger {
      color: var(--prism-danger);
      border-color: color-mix(in srgb, var(--prism-danger) 35%, transparent);
      background: color-mix(in srgb, var(--prism-danger) 12%, transparent);
    }
    .a11y-pill--danger .a11y-pill__label,
    .a11y-pill--danger .a11y-pill__value { color: var(--prism-danger); }
  `,
})
export class A11yHeaderBadgeComponent {
  private readonly manifest = inject<RuntimeManifest>(PRISM_MANIFEST);
  private readonly config = inject<NgPrismConfig>(PRISM_CONFIG);

  protected readonly data = computed(() => {
    const meta = this.manifest.meta?.['a11y'] as A11yManifestMeta | undefined;
    if (!meta?.total) return null;

    const score = meta.total.score;
    const thresholds = resolveA11yThresholds({
      ...meta.thresholds,
      ...this.config.a11y?.thresholds,
    });
    const variant = this.computeVariant(score, meta.total, thresholds);

    return {
      score,
      variant,
      title:
        `Library A11y: ${score}% (target ${thresholds.score}%)\n` +
        `${meta.total.auditedComponents} components · ${meta.total.auditedVariants} variants\n` +
        `Violations: ${meta.total.critical} critical · ${meta.total.serious} serious · ` +
        `${meta.total.moderate} moderate · ${meta.total.minor} minor`,
    };
  });

  private computeVariant(
    score: number,
    total: A11yManifestMeta['total'],
    thresholds: A11yThresholds
  ): Variant {
    if (total.critical > thresholds.critical) return 'danger';
    if (total.serious > thresholds.serious) return 'danger';
    if (score < thresholds.score * 0.75) return 'danger';
    if (score < thresholds.score) return 'warn';
    if (total.moderate > thresholds.moderate) return 'warn';
    return 'ok';
  }
}
