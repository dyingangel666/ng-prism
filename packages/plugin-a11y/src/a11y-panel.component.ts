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
        <div class="prism-a11y-panel__summary">
          <span class="prism-a11y-panel__badge prism-a11y-panel__badge--violation">
            {{ violations().length }} {{ violations().length === 1 ? 'Violation' : 'Violations' }}
          </span>
          <span class="prism-a11y-panel__badge prism-a11y-panel__badge--incomplete">
            {{ incomplete().length }} Incomplete
          </span>
          <span class="prism-a11y-panel__badge prism-a11y-panel__badge--pass">
            {{ passes().length }} Passes
          </span>
        </div>

        @if (violations().length) {
          <div class="prism-a11y-panel__section">
            <h3 class="prism-a11y-panel__heading prism-a11y-panel__heading--violation">Violations</h3>
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
                  <pre class="prism-a11y-panel__html"><code [highlight]="node.html" language="xml"></code></pre>
                }
                <a class="prism-a11y-panel__help-link" [href]="item.helpUrl" target="_blank" rel="noopener">
                  Learn more
                </a>
              </div>
            }
          </div>
        }

        @if (incomplete().length) {
          <div class="prism-a11y-panel__section">
            <h3 class="prism-a11y-panel__heading prism-a11y-panel__heading--incomplete">Needs Review</h3>
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

        @if (passes().length) {
          <div class="prism-a11y-panel__section">
            <h3 class="prism-a11y-panel__heading prism-a11y-panel__heading--pass">Passes</h3>
            @for (item of passes(); track item.id) {
              <div class="prism-a11y-panel__item prism-a11y-panel__item--pass">
                <span class="prism-a11y-panel__rule-id">{{ item.id }}</span>
                <span class="prism-a11y-panel__description">{{ item.description }}</span>
              </div>
            }
          </div>
        }
      } @else {
        <div class="prism-a11y-panel__empty">
          Select a component to run accessibility audit.
        </div>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
      height: 100%;
      overflow: auto;
    }
    .prism-a11y-panel {
      padding: 12px 16px;
      font-family: var(--prism-font-family, system-ui, sans-serif);
      font-size: 13px;
      color: var(--prism-text, #1f2937);
    }
    .prism-a11y-panel__summary {
      display: flex;
      gap: 8px;
      margin-bottom: 12px;
    }
    .prism-a11y-panel__badge {
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 12px;
      font-weight: 600;
    }
    .prism-a11y-panel__badge--violation {
      background: #fef2f2;
      color: #dc2626;
    }
    .prism-a11y-panel__badge--incomplete {
      background: #fffbeb;
      color: #d97706;
    }
    .prism-a11y-panel__badge--pass {
      background: #f0fdf4;
      color: #16a34a;
    }
    .prism-a11y-panel__section {
      margin-bottom: 16px;
    }
    .prism-a11y-panel__heading {
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin: 0 0 8px;
      padding-bottom: 4px;
      border-bottom: 1px solid var(--prism-border, #e5e7eb);
    }
    .prism-a11y-panel__heading--violation { color: #dc2626; }
    .prism-a11y-panel__heading--incomplete { color: #d97706; }
    .prism-a11y-panel__heading--pass { color: #16a34a; }
    .prism-a11y-panel__item {
      padding: 8px;
      margin-bottom: 6px;
      background: var(--prism-bg-surface, #f9fafb);
      border-radius: 6px;
      border: 1px solid var(--prism-border, #e5e7eb);
    }
    .prism-a11y-panel__item--pass {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .prism-a11y-panel__item-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;
    }
    .prism-a11y-panel__impact {
      padding: 1px 6px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .prism-a11y-panel__impact--critical {
      background: #dc2626;
      color: #fff;
    }
    .prism-a11y-panel__impact--serious {
      background: #f97316;
      color: #fff;
    }
    .prism-a11y-panel__impact--moderate {
      background: #eab308;
      color: #1f2937;
    }
    .prism-a11y-panel__impact--minor {
      background: #e5e7eb;
      color: #6b7280;
    }
    .prism-a11y-panel__rule-id {
      font-family: var(--prism-font-mono, monospace);
      font-size: 12px;
      color: var(--prism-text-muted, #6b7280);
    }
    .prism-a11y-panel__description {
      margin: 4px 0;
      line-height: 1.4;
    }
    .prism-a11y-panel__html {
      margin: 4px 0;
      padding: 0;
      background: var(--prism-bg, #fff);
      border: 1px solid var(--prism-border, #e5e7eb);
      border-radius: 4px;
      overflow: auto;
    }
    .prism-a11y-panel__html code {
      font-family: var(--prism-font-mono, monospace);
      font-size: 12px;
      line-height: 1.5;
      padding: 6px 10px;
      display: block;
    }
    .prism-a11y-panel__help-link {
      font-size: 12px;
      color: var(--prism-primary, #2563eb);
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
      color: var(--prism-text-muted, #6b7280);
    }
    .prism-a11y-panel__error {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 120px;
      color: #dc2626;
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
