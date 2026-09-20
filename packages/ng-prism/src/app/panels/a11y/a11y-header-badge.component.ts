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
import { PrismMetricBadgeComponent } from '../../shared/prism-metric-badge.component.js';
import { resolveA11yThresholds } from './a11y-thresholds.js';
import type { A11yManifestMeta, A11yThresholds } from './a11y.types.js';

type Variant = 'ok' | 'warn' | 'danger';

@Component({
  selector: 'prism-a11y-header-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrismMetricBadgeComponent],
  template: `
    @if (data(); as d) {
    <prism-metric-badge
      icon="accessibility"
      label="Library accessibility score"
      [value]="d.score + '%'"
      [variant]="d.variant"
      [title]="d.title"
    />
    }
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
