import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import type { Result } from 'axe-core';
import { Highlight } from 'ngx-highlightjs';
import { A11yAuditService } from './a11y-audit.service.js';
import { A11yScoreComponent } from './a11y-score.component.js';

const IMPACT_ORDER: Record<string, number> = {
  critical: 0,
  serious: 1,
  moderate: 2,
  minor: 3,
};

function sortByImpact(results: Result[]): Result[] {
  return [...results].sort(
    (a, b) => (IMPACT_ORDER[a.impact ?? ''] ?? 4) - (IMPACT_ORDER[b.impact ?? ''] ?? 4),
  );
}

@Component({
  selector: 'prism-a11y-violations',
  standalone: true,
  imports: [Highlight, A11yScoreComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (auditService.running()) {
      <div class="prism-a11y-v__status">Auditing…</div>
    } @else if (auditService.error()) {
      <div class="prism-a11y-v__error">Audit failed: {{ auditService.error() }}</div>
    } @else if (auditService.results()) {
      <div class="prism-a11y-v__hero">
        <prism-a11y-score [score]="scoreResult()!.score" />
        <div class="prism-a11y-v__meta">
          <div class="prism-a11y-v__score-num">{{ scoreResult()!.score }} / 100</div>
          <div class="prism-a11y-v__score-detail">
            {{ scoreResult()!.violations }} Violations · {{ scoreResult()!.passes }} Passes
          </div>
          <div class="prism-a11y-v__badges">
            @if (scoreResult()!.critical) {
              <span class="prism-a11y-v__badge prism-a11y-v__badge--critical">
                {{ scoreResult()!.critical }} critical
              </span>
            }
            @if (scoreResult()!.serious) {
              <span class="prism-a11y-v__badge prism-a11y-v__badge--serious">
                {{ scoreResult()!.serious }} serious
              </span>
            }
            @if (scoreResult()!.moderate) {
              <span class="prism-a11y-v__badge prism-a11y-v__badge--moderate">
                {{ scoreResult()!.moderate }} moderate
              </span>
            }
            @if (!scoreResult()!.violations) {
              <span class="prism-a11y-v__badge prism-a11y-v__badge--pass">All clear</span>
            }
          </div>
        </div>
      </div>

      <div class="prism-a11y-v__sections">
        <div class="prism-a11y-v__section">
          <button
            class="prism-a11y-v__sec-hdr prism-a11y-v__sec-hdr--violation"
            [class.prism-a11y-v__sec-hdr--open]="openSections().has('violations')"
            (click)="toggle('violations')"
          >
            <span class="prism-a11y-v__chevron">{{ openSections().has('violations') ? '▾' : '▸' }}</span>
            <span class="prism-a11y-v__sec-title">Violations</span>
            <span class="prism-a11y-v__count prism-a11y-v__count--violation">{{ violations().length }}</span>
          </button>
          @if (openSections().has('violations')) {
            <div class="prism-a11y-v__sec-body">
              @if (!violations().length) {
                <div class="prism-a11y-v__empty">No violations found.</div>
              }
              @for (item of violations(); track item.id) {
                <div class="prism-a11y-v__item">
                  <div class="prism-a11y-v__item-hdr">
                    <span class="prism-a11y-v__impact prism-a11y-v__impact--{{ item.impact }}">{{ item.impact }}</span>
                    <span class="prism-a11y-v__rule-id">{{ item.id }}</span>
                  </div>
                  <p class="prism-a11y-v__desc">{{ item.description }}</p>
                  @for (node of item.nodes; track $index) {
                    <div class="prism-a11y-v__code">
                      <pre><code [highlight]="node.html" language="xml"></code></pre>
                    </div>
                  }
                  <a class="prism-a11y-v__link" [href]="item.helpUrl" target="_blank" rel="noopener">
                    Learn more ↗
                  </a>
                </div>
              }
            </div>
          }
        </div>

        <div class="prism-a11y-v__section">
          <button
            class="prism-a11y-v__sec-hdr prism-a11y-v__sec-hdr--incomplete"
            [class.prism-a11y-v__sec-hdr--open]="openSections().has('incomplete')"
            (click)="toggle('incomplete')"
          >
            <span class="prism-a11y-v__chevron">{{ openSections().has('incomplete') ? '▾' : '▸' }}</span>
            <span class="prism-a11y-v__sec-title">Needs Review</span>
            <span class="prism-a11y-v__count prism-a11y-v__count--incomplete">{{ incomplete().length }}</span>
          </button>
          @if (openSections().has('incomplete')) {
            <div class="prism-a11y-v__sec-body">
              @if (!incomplete().length) {
                <div class="prism-a11y-v__empty">Nothing to review.</div>
              }
              @for (item of incomplete(); track item.id) {
                <div class="prism-a11y-v__item">
                  <div class="prism-a11y-v__item-hdr">
                    <span class="prism-a11y-v__impact prism-a11y-v__impact--{{ item.impact }}">{{ item.impact }}</span>
                    <span class="prism-a11y-v__rule-id">{{ item.id }}</span>
                  </div>
                  <p class="prism-a11y-v__desc">{{ item.description }}</p>
                </div>
              }
            </div>
          }
        </div>

        <div class="prism-a11y-v__section">
          <button
            class="prism-a11y-v__sec-hdr prism-a11y-v__sec-hdr--pass"
            [class.prism-a11y-v__sec-hdr--open]="openSections().has('passes')"
            (click)="toggle('passes')"
          >
            <span class="prism-a11y-v__chevron">{{ openSections().has('passes') ? '▾' : '▸' }}</span>
            <span class="prism-a11y-v__sec-title">Passes</span>
            <span class="prism-a11y-v__count prism-a11y-v__count--pass">{{ passes().length }}</span>
          </button>
          @if (openSections().has('passes')) {
            <div class="prism-a11y-v__sec-body">
              @if (!passes().length) {
                <div class="prism-a11y-v__empty">No passing rules.</div>
              }
              @for (item of passes(); track item.id) {
                <div class="prism-a11y-v__item prism-a11y-v__item--pass">
                  <span class="prism-a11y-v__rule-id">{{ item.id }}</span>
                  <span class="prism-a11y-v__desc">{{ item.description }}</span>
                </div>
              }
            </div>
          }
        </div>
      </div>
    } @else {
      <div class="prism-a11y-v__status">Select a component to run accessibility audit.</div>
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: auto;
      --a11y-red: #f87171;
      --a11y-amber: #fbbf24;
      --a11y-green: #4ade80;
    }

    .prism-a11y-v__hero {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 14px 20px;
      border-bottom: 1px solid var(--prism-border);
      flex-shrink: 0;
    }
    prism-a11y-score { width: 54px; height: 54px; flex-shrink: 0; }

    .prism-a11y-v__meta { display: flex; flex-direction: column; gap: 2px; }
    .prism-a11y-v__score-num { font-size: 20px; font-weight: 700; color: var(--prism-text); }
    .prism-a11y-v__score-detail { font-size: 12px; color: var(--prism-text-muted); }
    .prism-a11y-v__badges { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 4px; }

    .prism-a11y-v__badge {
      padding: 1px 7px; border-radius: 10px;
      font-size: 11px; font-weight: 600;
    }
    .prism-a11y-v__badge--critical {
      background: color-mix(in srgb, var(--a11y-red) 15%, transparent);
      color: var(--a11y-red);
    }
    .prism-a11y-v__badge--serious {
      background: color-mix(in srgb, #fb923c 15%, transparent);
      color: #fb923c;
    }
    .prism-a11y-v__badge--moderate {
      background: color-mix(in srgb, var(--a11y-amber) 12%, transparent);
      color: var(--a11y-amber);
    }
    .prism-a11y-v__badge--pass {
      background: color-mix(in srgb, var(--a11y-green) 12%, transparent);
      color: var(--a11y-green);
    }

    .prism-a11y-v__sections { display: flex; flex-direction: column; }
    .prism-a11y-v__section { border-bottom: 1px solid var(--prism-border); }

    .prism-a11y-v__sec-hdr {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 9px 16px 9px 12px;
      background: none;
      border: none;
      border-left: 3px solid transparent;
      cursor: pointer;
      font-family: var(--prism-font-sans, system-ui, sans-serif);
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--prism-text-muted);
      text-align: left;
      transition: background 0.1s, color 0.1s;
      user-select: none;
    }
    .prism-a11y-v__sec-hdr--violation { border-left-color: var(--a11y-red); }
    .prism-a11y-v__sec-hdr--violation:hover,
    .prism-a11y-v__sec-hdr--violation.prism-a11y-v__sec-hdr--open {
      background: color-mix(in srgb, var(--a11y-red) 7%, transparent);
      color: var(--a11y-red);
    }
    .prism-a11y-v__sec-hdr--incomplete { border-left-color: var(--a11y-amber); }
    .prism-a11y-v__sec-hdr--incomplete:hover,
    .prism-a11y-v__sec-hdr--incomplete.prism-a11y-v__sec-hdr--open {
      background: color-mix(in srgb, var(--a11y-amber) 7%, transparent);
      color: var(--a11y-amber);
    }
    .prism-a11y-v__sec-hdr--pass { border-left-color: var(--a11y-green); }
    .prism-a11y-v__sec-hdr--pass:hover,
    .prism-a11y-v__sec-hdr--pass.prism-a11y-v__sec-hdr--open {
      background: color-mix(in srgb, var(--a11y-green) 7%, transparent);
      color: var(--a11y-green);
    }

    .prism-a11y-v__chevron { font-size: 10px; width: 12px; flex-shrink: 0; opacity: 0.7; }
    .prism-a11y-v__sec-title { flex: 1; }
    .prism-a11y-v__count { padding: 1px 7px; border-radius: 10px; font-size: 11px; font-weight: 700; }
    .prism-a11y-v__count--violation {
      background: color-mix(in srgb, var(--a11y-red) 15%, transparent);
      color: var(--a11y-red);
    }
    .prism-a11y-v__count--incomplete {
      background: color-mix(in srgb, var(--a11y-amber) 12%, transparent);
      color: var(--a11y-amber);
    }
    .prism-a11y-v__count--pass {
      background: color-mix(in srgb, var(--a11y-green) 12%, transparent);
      color: var(--a11y-green);
    }

    .prism-a11y-v__sec-body {
      padding: 8px 12px 12px;
      background: var(--prism-bg);
    }
    .prism-a11y-v__empty { padding: 6px 4px; font-size: 12px; color: var(--prism-text-muted); }

    .prism-a11y-v__item {
      padding: 10px 12px;
      margin-bottom: 6px;
      background: var(--prism-bg-surface);
      border-radius: var(--prism-radius, 8px);
      border: 1px solid var(--prism-border);
    }
    .prism-a11y-v__item--pass {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 5px 12px;
    }
    .prism-a11y-v__item-hdr { display: flex; align-items: center; gap: 8px; margin-bottom: 5px; }

    .prism-a11y-v__impact {
      padding: 1px 6px;
      border-radius: var(--prism-radius-xs, 3px);
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .prism-a11y-v__impact--critical {
      background: color-mix(in srgb, var(--a11y-red) 18%, transparent);
      color: var(--a11y-red);
      border: 1px solid color-mix(in srgb, var(--a11y-red) 30%, transparent);
    }
    .prism-a11y-v__impact--serious {
      background: color-mix(in srgb, #fb923c 18%, transparent);
      color: #fb923c;
      border: 1px solid color-mix(in srgb, #fb923c 30%, transparent);
    }
    .prism-a11y-v__impact--moderate {
      background: color-mix(in srgb, var(--a11y-amber) 18%, transparent);
      color: var(--a11y-amber);
      border: 1px solid color-mix(in srgb, var(--a11y-amber) 30%, transparent);
    }
    .prism-a11y-v__impact--minor {
      background: color-mix(in srgb, var(--prism-text-muted) 10%, transparent);
      color: var(--prism-text-muted);
      border: 1px solid var(--prism-border);
    }

    .prism-a11y-v__rule-id {
      font-family: var(--prism-font-mono, monospace);
      font-size: 12px;
      color: var(--prism-text-muted);
    }
    .prism-a11y-v__desc { margin: 3px 0; font-size: 12px; line-height: 1.4; color: var(--prism-text-2); }

    .prism-a11y-v__code {
      margin: 7px 0 0;
      border-radius: var(--prism-radius-xs, 3px);
      overflow: hidden;
      border: 1px solid var(--prism-border);
      background: var(--prism-void);
    }
    .prism-a11y-v__code pre {
      margin: 0;
      padding: 10px 14px;
      font-size: 12px;
      line-height: 1.6;
      font-family: var(--prism-font-mono, monospace);
      overflow: auto;
    }
    .prism-a11y-v__code code { font-family: inherit; }
    :host ::ng-deep .prism-a11y-v__code .hljs { background: transparent; color: var(--prism-text-2); }
    :host ::ng-deep .prism-a11y-v__code .hljs-tag { color: var(--prism-text-muted); }
    :host ::ng-deep .prism-a11y-v__code .hljs-name { color: var(--prism-primary); }
    :host ::ng-deep .prism-a11y-v__code .hljs-attr { color: #93c5fd; }
    :host ::ng-deep .prism-a11y-v__code .hljs-string { color: #7dd3fc; }

    .prism-a11y-v__link {
      display: inline-block;
      margin-top: 5px;
      font-size: 12px;
      color: var(--prism-primary);
      text-decoration: none;
    }
    .prism-a11y-v__link:hover { text-decoration: underline; }

    .prism-a11y-v__status {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100px;
      color: var(--prism-text-muted);
      font-size: 13px;
    }
    .prism-a11y-v__error {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100px;
      color: var(--a11y-red);
      font-size: 13px;
    }
  `,
})
export class A11yViolationsComponent {
  protected readonly auditService = inject(A11yAuditService);

  protected readonly scoreResult = computed(() => this.auditService.scoreResult());
  protected readonly violations = computed(() =>
    sortByImpact(this.auditService.results()?.violations ?? []),
  );
  protected readonly incomplete = computed(() => this.auditService.results()?.incomplete ?? []);
  protected readonly passes = computed(() => this.auditService.results()?.passes ?? []);
  protected readonly openSections = signal<Set<string>>(new Set(['violations']));

  protected toggle(section: string): void {
    this.openSections.update((current) => {
      const next = new Set(current);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  }
}
