import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { A11yAuditService } from './a11y-audit.service.js';
import { A11yScoreComponent } from './a11y-score.component.js';

const IMPACT_ORDER: Record<string, number> = {
  critical: 0,
  serious: 1,
  moderate: 2,
  minor: 3,
};

const IMPACT_COLOR: Record<string, string> = {
  critical: 'var(--prism-danger)',
  serious: '#fb923c',
  moderate: 'var(--prism-warn)',
  minor: 'var(--prism-text-muted)',
};

function sevColor(impact: string | undefined): string {
  return IMPACT_COLOR[impact ?? ''] ?? 'var(--prism-success)';
}

@Component({
  selector: 'prism-a11y-violations',
  standalone: true,
  imports: [A11yScoreComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (auditService.error()) {
      <div class="a11y-status a11y-status--error">Audit failed: {{ auditService.error() }}</div>
    } @else if (auditService.results() || auditService.running()) {
      <div class="a11y-body" [class.a11y-body--loading]="auditService.running()">
        <div class="score-wrap">
          <prism-a11y-score [score]="scoreResult()?.score ?? 0" />
          <div class="score-label">axe-core audit</div>
          <div class="score-meta">
            @if (scoreResult()?.critical) {
              <span><i style="background: var(--prism-danger)"></i>{{ scoreResult()!.critical }} critical</span>
            }
            @if (scoreResult()?.moderate) {
              <span><i style="background: var(--prism-warn)"></i>{{ scoreResult()!.moderate }} moderate</span>
            }
            <span><i style="background: var(--prism-success)"></i>{{ scoreResult()?.passes ?? 0 }} pass</span>
          </div>
        </div>
        <div class="viol-list">
          @for (item of allResults(); track item.id + item.impact) {
            <div class="viol" [style.--sev-color]="sevColor(item.impact)">
              <span class="viol-sev">{{ item.impact ?? 'pass' }}</span>
              <div class="viol-text">
                <b>{{ item.description }}</b>
                @if (item.help) {
                  <span>{{ item.help }}</span>
                }
              </div>
              <span class="viol-rule">{{ item.id }}</span>
            </div>
          } @empty {
            @if (!auditService.running()) {
              <div class="a11y-status">No results yet.</div>
            }
          }
        </div>
      </div>
    } @else {
      <div class="a11y-status">Select a component to run accessibility audit.</div>
    }
  `,
  styles: `
    :host { display: flex; flex-direction: column; height: 100%; overflow: auto; }

    .a11y-body {
      padding: 18px 20px;
      display: grid;
      grid-template-columns: 220px 1fr;
      gap: 20px;
      min-height: 0;
    }
    .a11y-body--loading { opacity: 0.55; transition: opacity var(--dur-base); }

    .score-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      padding: 14px;
      background: var(--prism-bg-surface);
      border: 1px solid var(--prism-border);
      border-radius: 10px;
      align-self: start;
    }

    .score-label {
      font-size: 11px;
      color: var(--prism-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-weight: 600;
    }
    .score-meta {
      display: flex;
      gap: 12px;
      margin-top: 2px;
      font-size: 11px;
      color: var(--prism-text-muted);
    }
    .score-meta span { display: flex; align-items: center; gap: 4px; }
    .score-meta i { width: 6px; height: 6px; border-radius: 50%; display: block; }

    .viol-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      min-width: 0;
    }

    .viol {
      display: grid;
      grid-template-columns: auto 1fr auto;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
      background: var(--prism-bg-surface);
      border: 1px solid var(--prism-border);
      border-radius: 8px;
      border-left: 3px solid var(--sev-color, var(--prism-primary));
      transition: border-color var(--dur-fast);
    }
    .viol:hover { border-color: var(--prism-border-strong); }

    .viol-sev {
      font-family: var(--font-mono);
      font-size: 9.5px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: var(--radius-xs);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      background: color-mix(in srgb, var(--sev-color) 15%, transparent);
      color: var(--sev-color);
    }

    .viol-text {
      font-size: 12.5px;
      color: var(--prism-text);
      min-width: 0;
    }
    .viol-text b {
      display: block;
      font-weight: 600;
      margin-bottom: 1px;
    }
    .viol-text span {
      color: var(--prism-text-muted);
      font-size: 11.5px;
    }

    .viol-rule {
      font-family: var(--font-mono);
      font-size: 11px;
      color: var(--prism-text-ghost);
      padding: 2px 7px;
      background: var(--prism-input-bg);
      border-radius: var(--radius-xs);
      white-space: nowrap;
    }

    .a11y-status {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100px;
      color: var(--prism-text-muted);
      font-size: 13px;
    }
    .a11y-status--error { color: var(--prism-danger); }

    @media (max-width: 1100px) {
      .a11y-body { grid-template-columns: 1fr; }
    }
  `,
})
export class A11yViolationsComponent {
  protected readonly auditService = inject(A11yAuditService);

  protected readonly scoreResult = computed(() => this.auditService.scoreResult());

  protected readonly allResults = computed(() => {
    const results = this.auditService.results();
    if (!results) return [];
    const violations = [...results.violations].sort(
      (a, b) => (IMPACT_ORDER[a.impact ?? ''] ?? 4) - (IMPACT_ORDER[b.impact ?? ''] ?? 4),
    );
    const passes = results.passes.slice(0, 4);
    return [...violations, ...passes];
  });

  protected sevColor(impact: string | undefined): string {
    return sevColor(impact);
  }
}
