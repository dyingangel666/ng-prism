import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import type { AxeResults, Result } from 'axe-core';
import { Highlight } from 'ngx-highlightjs';
import { PrismRendererService } from 'ng-prism';
import type { A11yComponentConfig, A11yPluginOptions } from './a11y.types.js';
import { runA11yAudit } from './a11y-runner.js';

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
  selector: 'prism-a11y-panel',
  standalone: true,
  imports: [Highlight],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="prism-a11y-panel">
      @if (disabled()) {
        <div class="prism-a11y-panel__empty">
          Accessibility audit disabled for this component.
        </div>
      } @else if (running()) {
        <div class="prism-a11y-panel__status">
          Auditing…
        </div>
      } @else if (error()) {
        <div class="prism-a11y-panel__error">
          Audit failed: {{ error() }}
        </div>
      } @else if (results()) {
        <div class="prism-a11y-panel__sections">
          <div class="prism-a11y-panel__section">
            <button
              class="prism-a11y-panel__section-header prism-a11y-panel__section-header--violation"
              [class.prism-a11y-panel__section-header--open]="openSections().has('violations')"
              (click)="toggleSection('violations')"
            >
              <span class="prism-a11y-panel__section-chevron">
                {{ openSections().has('violations') ? '▾' : '▸' }}
              </span>
              <span class="prism-a11y-panel__section-title">Violations</span>
              <span class="prism-a11y-panel__section-count prism-a11y-panel__section-count--violation">
                {{ violations().length }}
              </span>
            </button>
            @if (openSections().has('violations')) {
              <div class="prism-a11y-panel__section-body">
                @if (violations().length === 0) {
                  <div class="prism-a11y-panel__section-empty">No violations found.</div>
                }
                @for (item of violations(); track item.id) {
                  <div class="prism-a11y-panel__item">
                    <div class="prism-a11y-panel__item-header">
                      <span class="prism-a11y-panel__impact prism-a11y-panel__impact--{{ item.impact }}">
                        {{ item.impact }}
                      </span>
                      <span class="prism-a11y-panel__rule-id">{{ item.id }}</span>
                    </div>
                    <p class="prism-a11y-panel__description">{{ item.description }}</p>
                    @for (node of item.nodes; track $index) {
                      <div class="prism-a11y-panel__code-block">
                        <pre><code [highlight]="node.html" language="xml"></code></pre>
                      </div>
                    }
                    <a class="prism-a11y-panel__help-link" [href]="item.helpUrl" target="_blank" rel="noopener">
                      Learn more
                    </a>
                  </div>
                }
              </div>
            }
          </div>

          <div class="prism-a11y-panel__section">
            <button
              class="prism-a11y-panel__section-header prism-a11y-panel__section-header--incomplete"
              [class.prism-a11y-panel__section-header--open]="openSections().has('incomplete')"
              (click)="toggleSection('incomplete')"
            >
              <span class="prism-a11y-panel__section-chevron">
                {{ openSections().has('incomplete') ? '▾' : '▸' }}
              </span>
              <span class="prism-a11y-panel__section-title">Needs Review</span>
              <span class="prism-a11y-panel__section-count prism-a11y-panel__section-count--incomplete">
                {{ incomplete().length }}
              </span>
            </button>
            @if (openSections().has('incomplete')) {
              <div class="prism-a11y-panel__section-body">
                @if (incomplete().length === 0) {
                  <div class="prism-a11y-panel__section-empty">Nothing to review.</div>
                }
                @for (item of incomplete(); track item.id) {
                  <div class="prism-a11y-panel__item">
                    <div class="prism-a11y-panel__item-header">
                      <span class="prism-a11y-panel__impact prism-a11y-panel__impact--{{ item.impact }}">
                        {{ item.impact }}
                      </span>
                      <span class="prism-a11y-panel__rule-id">{{ item.id }}</span>
                    </div>
                    <p class="prism-a11y-panel__description">{{ item.description }}</p>
                  </div>
                }
              </div>
            }
          </div>

          <div class="prism-a11y-panel__section">
            <button
              class="prism-a11y-panel__section-header prism-a11y-panel__section-header--pass"
              [class.prism-a11y-panel__section-header--open]="openSections().has('passes')"
              (click)="toggleSection('passes')"
            >
              <span class="prism-a11y-panel__section-chevron">
                {{ openSections().has('passes') ? '▾' : '▸' }}
              </span>
              <span class="prism-a11y-panel__section-title">Passes</span>
              <span class="prism-a11y-panel__section-count prism-a11y-panel__section-count--pass">
                {{ passes().length }}
              </span>
            </button>
            @if (openSections().has('passes')) {
              <div class="prism-a11y-panel__section-body">
                @if (passes().length === 0) {
                  <div class="prism-a11y-panel__section-empty">No passing rules.</div>
                }
                @for (item of passes(); track item.id) {
                  <div class="prism-a11y-panel__item prism-a11y-panel__item--pass">
                    <span class="prism-a11y-panel__rule-id">{{ item.id }}</span>
                    <span class="prism-a11y-panel__description">{{ item.description }}</span>
                  </div>
                }
              </div>
            }
          </div>
        </div>
      } @else {
        <div class="prism-a11y-panel__empty">
          Select a component to run accessibility audit.
        </div>
      }
    </div>
  `,
  styles: `
    /* Semantic color definitions (dark-theme muted variants) */
    :host {
      display: block;
      height: 100%;
      overflow: auto;
      --a11y-red: #f87171;
      --a11y-amber: #fbbf24;
      --a11y-green: #4ade80;
    }
    .prism-a11y-panel {
      font-family: var(--prism-font-sans, system-ui, sans-serif);
      font-size: 13px;
      color: var(--prism-text);
    }
    .prism-a11y-panel__sections {
      display: flex;
      flex-direction: column;
    }
    .prism-a11y-panel__section {
      border-bottom: 1px solid var(--prism-border);
    }

    /* Section headers — signature: colored left border + color-mix tint */
    .prism-a11y-panel__section-header {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px 10px 13px;
      background: none;
      border: none;
      border-left: 3px solid transparent;
      cursor: pointer;
      font-family: var(--prism-font-sans, system-ui, sans-serif);
      font-size: 11px;
      font-weight: 600;
      text-align: left;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--prism-text-muted);
      transition: background 0.1s, color 0.1s, border-color 0.1s;
      user-select: none;
    }
    .prism-a11y-panel__section-header--violation {
      border-left-color: var(--a11y-red);
    }
    .prism-a11y-panel__section-header--violation:hover {
      background: color-mix(in srgb, var(--a11y-red) 6%, transparent);
      color: var(--a11y-red);
    }
    .prism-a11y-panel__section-header--violation.prism-a11y-panel__section-header--open {
      background: color-mix(in srgb, var(--a11y-red) 8%, transparent);
      color: var(--a11y-red);
    }
    .prism-a11y-panel__section-header--incomplete {
      border-left-color: var(--a11y-amber);
    }
    .prism-a11y-panel__section-header--incomplete:hover {
      background: color-mix(in srgb, var(--a11y-amber) 6%, transparent);
      color: var(--a11y-amber);
    }
    .prism-a11y-panel__section-header--incomplete.prism-a11y-panel__section-header--open {
      background: color-mix(in srgb, var(--a11y-amber) 8%, transparent);
      color: var(--a11y-amber);
    }
    .prism-a11y-panel__section-header--pass {
      border-left-color: var(--a11y-green);
    }
    .prism-a11y-panel__section-header--pass:hover {
      background: color-mix(in srgb, var(--a11y-green) 6%, transparent);
      color: var(--a11y-green);
    }
    .prism-a11y-panel__section-header--pass.prism-a11y-panel__section-header--open {
      background: color-mix(in srgb, var(--a11y-green) 8%, transparent);
      color: var(--a11y-green);
    }

    .prism-a11y-panel__section-chevron {
      font-size: 10px;
      width: 12px;
      flex-shrink: 0;
      opacity: 0.7;
    }
    .prism-a11y-panel__section-title {
      flex: 1;
    }
    .prism-a11y-panel__section-count {
      padding: 1px 7px;
      border-radius: 10px;
      font-size: 11px;
      font-weight: 700;
    }
    .prism-a11y-panel__section-count--violation {
      background: color-mix(in srgb, var(--a11y-red) 15%, transparent);
      color: var(--a11y-red);
    }
    .prism-a11y-panel__section-count--incomplete {
      background: color-mix(in srgb, var(--a11y-amber) 15%, transparent);
      color: var(--a11y-amber);
    }
    .prism-a11y-panel__section-count--pass {
      background: color-mix(in srgb, var(--a11y-green) 15%, transparent);
      color: var(--a11y-green);
    }

    .prism-a11y-panel__section-body {
      padding: 8px 12px 12px;
      background: var(--prism-bg);
    }
    .prism-a11y-panel__section-empty {
      padding: 8px 4px;
      font-size: 12px;
      color: var(--prism-text-muted);
    }
    .prism-a11y-panel__item {
      padding: 10px 12px;
      margin-bottom: 6px;
      background: var(--prism-bg-surface);
      border-radius: var(--prism-radius, 8px);
      border: 1px solid var(--prism-border);
    }
    .prism-a11y-panel__item--pass {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
    }
    .prism-a11y-panel__item-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
    }
    .prism-a11y-panel__impact {
      padding: 1px 6px;
      border-radius: var(--prism-radius-xs, 3px);
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .prism-a11y-panel__impact--critical {
      background: color-mix(in srgb, var(--a11y-red) 18%, transparent);
      color: var(--a11y-red);
      border: 1px solid color-mix(in srgb, var(--a11y-red) 30%, transparent);
    }
    .prism-a11y-panel__impact--serious {
      background: color-mix(in srgb, #fb923c 18%, transparent);
      color: #fb923c;
      border: 1px solid color-mix(in srgb, #fb923c 30%, transparent);
    }
    .prism-a11y-panel__impact--moderate {
      background: color-mix(in srgb, var(--a11y-amber) 18%, transparent);
      color: var(--a11y-amber);
      border: 1px solid color-mix(in srgb, var(--a11y-amber) 30%, transparent);
    }
    .prism-a11y-panel__impact--minor {
      background: color-mix(in srgb, var(--prism-text-muted) 12%, transparent);
      color: var(--prism-text-muted);
      border: 1px solid var(--prism-border);
    }
    .prism-a11y-panel__rule-id {
      font-family: var(--prism-font-mono, monospace);
      font-size: 12px;
      color: var(--prism-text-muted);
    }
    .prism-a11y-panel__description {
      margin: 4px 0;
      line-height: 1.45;
      color: var(--prism-text-2);
    }
    .prism-a11y-panel__code-block {
      margin: 8px 0;
      border-radius: var(--prism-radius-xs, 3px);
      overflow: hidden;
      border: 1px solid var(--prism-border);
      background: var(--prism-void);
    }
    .prism-a11y-panel__code-block pre {
      margin: 0;
      padding: 12px 16px;
      font-size: 12.5px;
      line-height: 1.65;
      font-family: var(--prism-font-mono, monospace);
      overflow: auto;
    }
    .prism-a11y-panel__code-block code {
      font-family: inherit;
    }
    :host ::ng-deep .prism-a11y-panel__code-block .hljs {
      background: transparent;
      color: var(--prism-text-2);
    }
    :host ::ng-deep .prism-a11y-panel__code-block .hljs-tag { color: var(--prism-text-muted); }
    :host ::ng-deep .prism-a11y-panel__code-block .hljs-name { color: var(--prism-primary); }
    :host ::ng-deep .prism-a11y-panel__code-block .hljs-attr { color: #93c5fd; }
    :host ::ng-deep .prism-a11y-panel__code-block .hljs-string { color: #7dd3fc; }
    .prism-a11y-panel__help-link {
      display: inline-block;
      margin-top: 6px;
      font-size: 12px;
      color: var(--prism-primary);
      text-decoration: none;
    }
    .prism-a11y-panel__help-link:hover {
      text-decoration: underline;
    }
    .prism-a11y-panel__status,
    .prism-a11y-panel__empty {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 120px;
      color: var(--prism-text-muted);
    }
    .prism-a11y-panel__error {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 120px;
      color: var(--a11y-red);
    }
  `,
})
export class A11yPanelComponent {
  private readonly rendererService = inject(PrismRendererService);

  readonly activeComponent = input<unknown>(null);
  readonly pluginOptions = input<A11yPluginOptions | undefined>(undefined);

  protected readonly results = signal<AxeResults | null>(null);
  protected readonly running = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly openSections = signal<Set<string>>(new Set(['violations']));

  protected readonly violations = computed(() => sortByImpact(this.results()?.violations ?? []));
  protected readonly incomplete = computed(() => this.results()?.incomplete ?? []);
  protected readonly passes = computed(() => this.results()?.passes ?? []);

  protected readonly disabled = computed(() => {
    const comp = this.activeComponent() as any;
    const config: A11yComponentConfig | undefined = comp?.meta?.showcaseConfig?.meta?.['a11y'];
    return config?.disable === true;
  });

  private auditTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      const element = this.rendererService.renderedElement();
      const comp = this.activeComponent() as any;
      this.rendererService.inputValues();
      this.rendererService.activeVariantIndex();

      if (!element || !comp || this.disabled()) {
        this.results.set(null);
        this.error.set(null);
        return;
      }

      this.scheduleAudit(element, comp);
    });
  }

  protected toggleSection(section: string): void {
    this.openSections.update((current) => {
      const next = new Set(current);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  }

  private scheduleAudit(element: Element, comp: any): void {
    if (this.auditTimer) {
      clearTimeout(this.auditTimer);
    }

    this.running.set(true);
    this.error.set(null);

    this.auditTimer = setTimeout(() => {
      const componentConfig: A11yComponentConfig | undefined =
        comp.meta?.showcaseConfig?.meta?.['a11y'];

      runA11yAudit(element, this.pluginOptions() ?? undefined, componentConfig).then(
        (axeResults) => {
          this.results.set(axeResults);
          this.running.set(false);
        },
        (err) => {
          this.error.set(err instanceof Error ? err.message : String(err));
          this.running.set(false);
        },
      );
    }, 500);
  }
}
