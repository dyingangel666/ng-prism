import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { PRISM_MANIFEST } from '@ng-prism/core/plugin';
import type { RuntimeManifest } from '@ng-prism/core/plugin';
import { PrismMetricBadgeComponent } from '@ng-prism/core';
import { deriveCoverageSummary } from './coverage-summary.js';
import type { CoverageManifestMeta } from './coverage.types.js';

@Component({
  selector: 'prism-coverage-header-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrismMetricBadgeComponent],
  template: `
    @if (data(); as d) {
    <prism-metric-badge
      icon="shield-check"
      label="Library coverage"
      [value]="d.score + '%'"
      [variant]="d.variant"
      [title]="d.title"
    />
    }
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
    // Both halves come from the one derivation, so the pill's first line and
    // the navigation marker's tooltip cannot name different targets.
    const { variant, label } = deriveCoverageSummary(score, meta.thresholds);

    return {
      score,
      variant,
      title:
        `Library ${label}\n` +
        `Lines ${meta.total.lines.pct}% · ` +
        `Branches ${meta.total.branches.pct}% · ` +
        `Functions ${meta.total.functions.pct}% · ` +
        `Statements ${meta.total.statements.pct}%`,
    };
  });
}
