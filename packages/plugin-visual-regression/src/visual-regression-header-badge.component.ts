import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { PRISM_MANIFEST } from '@ng-prism/core/plugin';
import type { RuntimeManifest } from '@ng-prism/core/plugin';
import { PrismMetricBadgeComponent } from '@ng-prism/core';
import type { VrtManifestMeta } from './visual-regression.types.js';

type Variant = 'ok' | 'warn' | 'danger';

@Component({
  selector: 'prism-visual-regression-header-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrismMetricBadgeComponent],
  template: `
    @if (data(); as d) {
    <prism-metric-badge
      icon="camera"
      label="Library visual regression"
      [value]="d.score + '%'"
      [variant]="d.variant"
      [title]="d.title"
    />
    }
  `,
})
export class VisualRegressionHeaderBadgeComponent {
  private readonly manifest = inject<RuntimeManifest>(PRISM_MANIFEST);

  protected readonly data = computed(() => {
    const meta = this.manifest.meta?.['visualRegression'] as
      | VrtManifestMeta
      | undefined;
    if (!meta?.found || !meta.total) return null;

    const { total, thresholds } = meta;
    const variant: Variant =
      total.score >= thresholds.score
        ? 'ok'
        : total.score >= thresholds.score * 0.75
        ? 'warn'
        : 'danger';

    // `new` and `excluded` stay out of the headline counts on purpose — neither
    // has regressed, so both are reported but never framed as a fault.
    const parts = [
      `Visual regression: ${total.score}% unchanged (target ${thresholds.score}%)`,
      `${total.unchanged} unchanged · ${total.changed} changed · ${total.sizeMismatch} resized`,
      `${total.new} new (no baseline yet)`,
    ];
    if (total.excluded) parts.push(`${total.excluded} excluded`);
    parts.push(
      `${total.auditedVariants} variants across ${total.auditedComponents} components`
    );

    return { score: total.score, variant, title: parts.join('\n') };
  });
}
