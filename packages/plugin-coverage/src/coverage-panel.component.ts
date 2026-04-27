import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { CoverageData, FileCoverageDetail } from './coverage.types.js';

@Component({
  selector: 'prism-coverage-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (coverage()?.found) {
      <div class="cov-body">
        <div class="cov-summary">
          @for (stat of summaryStats(); track stat.label) {
            <div class="cov-stat">
              <div class="cov-stat-k">{{ stat.label }}</div>
              <div class="cov-stat-v">{{ stat.pct }}<small>%</small></div>
              <div class="cov-bar">
                <div class="cov-bar-fill" [style.width.%]="stat.pct"></div>
              </div>
            </div>
          }
        </div>

        @if (files().length) {
          <div class="cov-files">
            <div class="cov-file cov-file--header">
              <span>File</span>
              <span>Lines</span>
              <span>Branch</span>
              <span>Func</span>
              <span>Stmt</span>
            </div>
            @for (file of files(); track file.path) {
              <div class="cov-file">
                <span class="cov-file-name">{{ fileName(file.path) }}</span>
                <span class="cov-file-val" [class.bad]="file.lines.pct < 80">{{ file.lines.pct }}%</span>
                <span class="cov-file-val" [class.bad]="file.branches.pct < 80">{{ file.branches.pct }}%</span>
                <span class="cov-file-val" [class.bad]="file.functions.pct < 80">{{ file.functions.pct }}%</span>
                <span class="cov-file-val" [class.bad]="file.statements.pct < 80">{{ file.statements.pct }}%</span>
              </div>
            }
          </div>
        }
      </div>
    } @else {
      <div class="cov-empty">
        <p>No coverage data. Run tests with coverage enabled.</p>
      </div>
    }
  `,
  styles: `
    :host { display: block; height: 100%; overflow: auto; }

    .cov-body { padding: 20px 24px; }

    .cov-summary {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 18px;
    }

    .cov-stat {
      padding: 12px 14px;
      background: var(--prism-bg-surface);
      border: 1px solid var(--prism-border);
      border-radius: 8px;
    }
    .cov-stat-k {
      font-size: 10.5px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--prism-text-ghost);
      font-weight: 700;
      margin-bottom: 6px;
    }
    .cov-stat-v {
      font-family: var(--font-mono);
      font-size: 22px;
      font-weight: 700;
      color: var(--prism-text);
      letter-spacing: -0.02em;
    }
    .cov-stat-v small {
      font-size: 13px;
      color: var(--prism-text-muted);
      font-weight: 500;
    }
    .cov-bar {
      margin-top: 8px;
      height: 4px;
      background: var(--prism-input-bg);
      border-radius: 2px;
      overflow: hidden;
    }
    .cov-bar-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--prism-primary-from), var(--prism-primary-to));
      border-radius: 2px;
      transition: width 0.6s;
    }

    .cov-files {
      padding: 12px;
      background: var(--prism-bg-surface);
      border: 1px solid var(--prism-border);
      border-radius: 8px;
    }

    .cov-file {
      display: grid;
      grid-template-columns: 1fr auto auto auto auto;
      align-items: center;
      gap: 16px;
      padding: 7px 4px;
      font-family: var(--font-mono);
      font-size: 12px;
      border-bottom: 1px solid var(--prism-border);
    }
    .cov-file:last-child { border-bottom: 0; }

    .cov-file--header {
      border-bottom: 1px solid var(--prism-border-strong);
      padding-bottom: 8px;
      color: var(--prism-text-ghost);
      font-size: 10.5px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      font-weight: 700;
    }

    .cov-file-name { color: var(--prism-text-2); }
    .cov-file-val {
      color: var(--prism-text);
      min-width: 54px;
      text-align: right;
    }
    .cov-file-val.bad { color: var(--prism-warn); }

    .cov-empty {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 120px;
      color: var(--prism-text-muted);
      font-size: 13px;
      text-align: center;
    }
  `,
})
export class CoveragePanelComponent {
  readonly activeComponent = input<unknown>(null);

  protected readonly coverage = computed<CoverageData | null>(() => {
    const comp = this.activeComponent() as any;
    return (comp?.meta?.showcaseConfig?.meta?.['coverage'] as CoverageData) ?? null;
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

  protected fileName(path: string): string {
    const parts = path.split('/');
    return parts[parts.length - 1];
  }
}
