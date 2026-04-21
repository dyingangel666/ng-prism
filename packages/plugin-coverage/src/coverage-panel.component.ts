import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { CoverageData, MetricDetail } from './coverage.types.js';

interface MetricRow {
  label: string;
  detail: MetricDetail;
  level: 'good' | 'warn' | 'bad';
}

@Component({
  selector: 'prism-coverage-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (coverage()?.found) {
      <div class="prism-coverage">
        <div class="prism-coverage__header">
          <span class="prism-coverage__title">Test Coverage</span>
          <span class="prism-coverage__score" [attr.data-level]="scoreLevel()">{{ coverage()!.score }}%</span>
        </div>
        <div class="prism-coverage__metrics">
          @for (row of metricRows(); track row.label) {
            <div class="prism-coverage__row">
              <span class="prism-coverage__label">{{ row.label }}</span>
              <div class="prism-coverage__bar-track">
                <div
                  class="prism-coverage__bar-fill"
                  [attr.data-level]="row.level"
                  [style.width.%]="row.detail.pct"
                ></div>
              </div>
              <span class="prism-coverage__pct" [attr.data-level]="row.level">{{ row.detail.pct }}%</span>
              <span class="prism-coverage__ratio">{{ row.detail.covered }}/{{ row.detail.total }}</span>
            </div>
          }
        </div>
      </div>
    } @else {
      <div class="prism-coverage prism-coverage--empty">
        <p class="prism-coverage__hint">
          Keine Coverage-Daten gefunden.<br />
          Fuehre <code>nx test &lt;project&gt; --coverage</code> aus und rebuilde den Styleguide.
        </p>
      </div>
    }
  `,
  styles: `
    .prism-coverage {
      padding: 16px;
      font-family: var(--prism-font-sans, system-ui, sans-serif);
      font-size: 13px;
      color: var(--prism-text, #e2e4e9);
    }

    .prism-coverage--empty {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 120px;
    }

    .prism-coverage__hint {
      color: var(--prism-text-muted, #8b8fa3);
      text-align: center;
      line-height: 1.6;
    }

    .prism-coverage__hint code {
      background: rgba(255, 255, 255, 0.06);
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 12px;
    }

    .prism-coverage__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
    }

    .prism-coverage__title {
      font-weight: 600;
      font-size: 14px;
    }

    .prism-coverage__score {
      font-weight: 700;
      font-size: 16px;
    }

    [data-level="good"] { color: #4ade80; }
    [data-level="warn"] { color: #fbbf24; }
    [data-level="bad"] { color: #f87171; }

    .prism-coverage__metrics {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .prism-coverage__row {
      display: grid;
      grid-template-columns: 90px 1fr 50px 70px;
      align-items: center;
      gap: 10px;
    }

    .prism-coverage__label {
      color: var(--prism-text-muted, #8b8fa3);
      font-size: 12px;
    }

    .prism-coverage__bar-track {
      height: 6px;
      border-radius: 3px;
      background: rgba(255, 255, 255, 0.06);
      overflow: hidden;
    }

    .prism-coverage__bar-fill {
      height: 100%;
      border-radius: 3px;
      transition: width 0.3s ease;
    }

    .prism-coverage__bar-fill[data-level="good"] { background: #4ade80; }
    .prism-coverage__bar-fill[data-level="warn"] { background: #fbbf24; }
    .prism-coverage__bar-fill[data-level="bad"] { background: #f87171; }

    .prism-coverage__pct {
      text-align: right;
      font-weight: 600;
      font-size: 12px;
    }

    .prism-coverage__ratio {
      text-align: right;
      font-size: 11px;
      color: var(--prism-text-muted, #8b8fa3);
    }
  `,
})
export class CoveragePanelComponent {
  readonly activeComponent = input<unknown>(null);

  protected readonly coverage = computed<CoverageData | null>(() => {
    const comp = this.activeComponent() as any;
    return (comp?.meta?.showcaseConfig?.meta?.['coverage'] as CoverageData) ?? null;
  });

  protected readonly scoreLevel = computed(() => {
    const s = this.coverage()?.score ?? 0;
    if (s >= 80) return 'good';
    if (s >= 50) return 'warn';
    return 'bad';
  });

  protected readonly metricRows = computed<MetricRow[]>(() => {
    const c = this.coverage();
    if (!c?.found) return [];

    const toLevel = (pct: number): 'good' | 'warn' | 'bad' => {
      if (pct >= 80) return 'good';
      if (pct >= 50) return 'warn';
      return 'bad';
    };

    return [
      { label: 'Statements', detail: c.statements, level: toLevel(c.statements.pct) },
      { label: 'Branches', detail: c.branches, level: toLevel(c.branches.pct) },
      { label: 'Functions', detail: c.functions, level: toLevel(c.functions.pct) },
      { label: 'Lines', detail: c.lines, level: toLevel(c.lines.pct) },
    ];
  });
}
