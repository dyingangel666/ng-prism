import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import type {
  CoverageData,
  CoverageThresholds,
  FileCoverageDetail,
} from './coverage.types.js';

const FALLBACK_THRESHOLDS: CoverageThresholds = {
  lines: 80,
  branches: 80,
  functions: 80,
  statements: 80,
};

@Component({
  selector: 'prism-coverage-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './coverage-panel.component.html',
  styleUrl: './coverage-panel.component.css',
})
export class CoveragePanelComponent {
  readonly activeComponent = input<unknown>(null);

  protected readonly coverage = computed<CoverageData | null>(() => {
    const comp = this.activeComponent() as any;
    return (
      (comp?.meta?.showcaseConfig?.meta?.['coverage'] as CoverageData) ?? null
    );
  });

  protected readonly summaryStats = computed(() => {
    const c = this.coverage();
    if (!c?.found) return [];
    return [
      { label: 'Lines', pct: c.lines.pct },
      { label: 'Branches', pct: c.branches.pct },
      { label: 'Functions', pct: c.functions.pct },
      { label: 'Statements', pct: c.statements.pct },
    ];
  });

  protected readonly files = computed<FileCoverageDetail[]>(() => {
    return this.coverage()?.files ?? [];
  });

  protected readonly thresholds = computed<CoverageThresholds>(() => {
    return this.coverage()?.thresholds ?? FALLBACK_THRESHOLDS;
  });

  protected fileName(path: string): string {
    const parts = path.split('/');
    return parts[parts.length - 1];
  }
}
