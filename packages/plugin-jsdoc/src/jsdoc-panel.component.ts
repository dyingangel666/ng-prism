import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Highlight } from 'ngx-highlightjs';
import type { InputMeta, OutputMeta } from 'ng-prism/plugin';
import type { JsDocData } from './jsdoc.types.js';

@Component({
  selector: 'prism-jsdoc-panel',
  standalone: true,
  imports: [Highlight],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="prism-jsdoc-panel">
      @if (!activeComponent()) {
        <div class="prism-jsdoc-panel__empty">Select a component to view API documentation.</div>
      } @else {
        @if (classDescription()) {
          <p class="prism-jsdoc-panel__description">{{ classDescription() }}</p>
        }
        @if (hasTags()) {
          <div class="prism-jsdoc-panel__meta">
            @if (isDeprecated()) {
              <span class="prism-jsdoc-panel__badge prism-jsdoc-panel__badge--deprecated">
                Deprecated{{ deprecatedMessage() ? ': ' + deprecatedMessage() : '' }}
              </span>
            }
            @if (since()) {
              <span class="prism-jsdoc-panel__meta-item">
                <span class="prism-jsdoc-panel__meta-label">Since:</span> {{ since() }}
              </span>
            }
            @for (ref of seeRefs(); track $index) {
              <span class="prism-jsdoc-panel__meta-item">
                <span class="prism-jsdoc-panel__meta-label">See:</span> {{ ref }}
              </span>
            }
          </div>
        }
        @if (examples().length) {
          <div class="prism-jsdoc-panel__section">
            <h3 class="prism-jsdoc-panel__heading">Examples</h3>
            @for (example of examples(); track $index) {
              <pre class="prism-jsdoc-panel__code"><code [highlight]="example" language="typescript"></code></pre>
            }
          </div>
        }
        @if (inputs().length) {
          <div class="prism-jsdoc-panel__section">
            <h3 class="prism-jsdoc-panel__heading">Inputs</h3>
            <table class="prism-jsdoc-panel__table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Default</th>
                  <th>Required</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                @for (inp of inputs(); track inp.name) {
                  <tr [class.prism-jsdoc-panel__row--deprecated]="isMemberDeprecated(inp.name)">
                    <td class="prism-jsdoc-panel__cell--name">
                      <code>{{ inp.name }}</code>
                      @if (isMemberDeprecated(inp.name)) {
                        <span class="prism-jsdoc-panel__badge prism-jsdoc-panel__badge--deprecated prism-jsdoc-panel__badge--small">deprecated</span>
                      }
                    </td>
                    <td class="prism-jsdoc-panel__cell--type">
                      <code>{{ inp.type }}{{ inp.values?.length ? ' (' + inp.values!.join(' | ') + ')' : '' }}</code>
                    </td>
                    <td class="prism-jsdoc-panel__cell--default">
                      @if (inp.defaultValue !== undefined) {
                        <code>{{ formatDefault(inp.defaultValue) }}</code>
                      } @else {
                        <span class="prism-jsdoc-panel__muted">—</span>
                      }
                    </td>
                    <td class="prism-jsdoc-panel__cell--required">
                      @if (inp.required) {
                        <span class="prism-jsdoc-panel__badge prism-jsdoc-panel__badge--required">required</span>
                      } @else {
                        <span class="prism-jsdoc-panel__muted">—</span>
                      }
                    </td>
                    <td class="prism-jsdoc-panel__cell--doc">
                      {{ inp.doc ?? getMemberSince(inp.name) ? memberDocLine(inp.name, inp.doc) : '' }}
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
        @if (outputs().length) {
          <div class="prism-jsdoc-panel__section">
            <h3 class="prism-jsdoc-panel__heading">Outputs</h3>
            <table class="prism-jsdoc-panel__table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                @for (out of outputs(); track out.name) {
                  <tr [class.prism-jsdoc-panel__row--deprecated]="isMemberDeprecated(out.name)">
                    <td class="prism-jsdoc-panel__cell--name">
                      <code>{{ out.name }}</code>
                      @if (isMemberDeprecated(out.name)) {
                        <span class="prism-jsdoc-panel__badge prism-jsdoc-panel__badge--deprecated prism-jsdoc-panel__badge--small">deprecated</span>
                      }
                    </td>
                    <td class="prism-jsdoc-panel__cell--doc">
                      {{ memberDocLine(out.name, out.doc) }}
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
      height: 100%;
      overflow: auto;
    }
    .prism-jsdoc-panel {
      padding: 12px 16px;
      font-family: var(--prism-font-family, system-ui, sans-serif);
      font-size: 13px;
      color: var(--prism-text, #1f2937);
    }
    .prism-jsdoc-panel__empty {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 120px;
      color: var(--prism-text-muted, #6b7280);
    }
    .prism-jsdoc-panel__description {
      margin: 0 0 12px;
      line-height: 1.5;
      color: var(--prism-text, #1f2937);
    }
    .prism-jsdoc-panel__meta {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 12px;
    }
    .prism-jsdoc-panel__meta-item {
      font-size: 12px;
      color: var(--prism-text-muted, #6b7280);
    }
    .prism-jsdoc-panel__meta-label {
      font-weight: 600;
      color: var(--prism-text, #1f2937);
    }
    .prism-jsdoc-panel__badge {
      display: inline-flex;
      align-items: center;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 12px;
      font-weight: 600;
    }
    .prism-jsdoc-panel__badge--deprecated {
      background: #fef3c7;
      color: #92400e;
    }
    .prism-jsdoc-panel__badge--required {
      background: #dbeafe;
      color: #1d4ed8;
    }
    .prism-jsdoc-panel__badge--small {
      padding: 1px 5px;
      font-size: 10px;
      margin-left: 4px;
      vertical-align: middle;
    }
    .prism-jsdoc-panel__section {
      margin-bottom: 20px;
    }
    .prism-jsdoc-panel__heading {
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin: 0 0 8px;
      padding-bottom: 4px;
      border-bottom: 1px solid var(--prism-border, #e5e7eb);
      color: var(--prism-text-muted, #6b7280);
    }
    .prism-jsdoc-panel__code {
      margin: 0 0 8px;
      padding: 0;
      background: var(--prism-bg-surface, #f9fafb);
      border: 1px solid var(--prism-border, #e5e7eb);
      border-radius: 6px;
      overflow: auto;
    }
    .prism-jsdoc-panel__code code {
      font-family: var(--prism-font-mono, monospace);
      font-size: 12px;
      line-height: 1.5;
      padding: 8px 12px;
      display: block;
    }
    .prism-jsdoc-panel__table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    .prism-jsdoc-panel__table th {
      text-align: left;
      padding: 6px 10px;
      font-weight: 600;
      color: var(--prism-text-muted, #6b7280);
      border-bottom: 1px solid var(--prism-border, #e5e7eb);
      white-space: nowrap;
    }
    .prism-jsdoc-panel__table td {
      padding: 6px 10px;
      border-bottom: 1px solid var(--prism-border, #e5e7eb);
      vertical-align: top;
    }
    .prism-jsdoc-panel__table tr:last-child td {
      border-bottom: none;
    }
    .prism-jsdoc-panel__row--deprecated td {
      opacity: 0.6;
    }
    .prism-jsdoc-panel__cell--name code,
    .prism-jsdoc-panel__cell--type code,
    .prism-jsdoc-panel__cell--default code {
      font-family: var(--prism-font-mono, monospace);
      font-size: 11px;
      background: var(--prism-bg-surface, #f9fafb);
      padding: 1px 4px;
      border-radius: 3px;
      border: 1px solid var(--prism-border, #e5e7eb);
    }
    .prism-jsdoc-panel__muted {
      color: var(--prism-text-muted, #6b7280);
    }
    .prism-jsdoc-panel__cell--doc {
      color: var(--prism-text, #1f2937);
      line-height: 1.4;
    }
  `,
})
export class JsDocPanelComponent {
  readonly activeComponent = input<unknown>(null);

  protected readonly jsdocData = computed<JsDocData | null>(() => {
    const comp = this.activeComponent() as any;
    return (comp?.meta?.showcaseConfig?.meta?.['jsdoc'] as JsDocData) ?? null;
  });

  protected readonly inputs = computed<InputMeta[]>(() => {
    const comp = this.activeComponent() as any;
    return comp?.meta?.inputs ?? [];
  });

  protected readonly outputs = computed<OutputMeta[]>(() => {
    const comp = this.activeComponent() as any;
    return comp?.meta?.outputs ?? [];
  });

  protected readonly classDescription = computed(() => this.jsdocData()?.classDescription);

  protected readonly classTags = computed(() => this.jsdocData()?.classTags ?? {});

  protected readonly isDeprecated = computed(() => !!this.classTags().deprecated);

  protected readonly deprecatedMessage = computed(() => {
    const d = this.classTags().deprecated;
    return typeof d === 'string' ? d : undefined;
  });

  protected readonly since = computed(() => this.classTags().since);

  protected readonly seeRefs = computed(() => this.classTags().see ?? []);

  protected readonly examples = computed(() => this.classTags().example ?? []);

  protected readonly hasTags = computed(
    () => this.isDeprecated() || !!this.since() || this.seeRefs().length > 0,
  );

  protected isMemberDeprecated(name: string): boolean {
    return !!this.jsdocData()?.memberTags[name]?.deprecated;
  }

  protected getMemberSince(name: string): string | undefined {
    return this.jsdocData()?.memberTags[name]?.since;
  }

  protected memberDocLine(name: string, doc: string | undefined): string {
    const parts: string[] = [];
    if (doc) parts.push(doc);
    const since = this.getMemberSince(name);
    if (since) parts.push(`Since ${since}`);
    return parts.join(' · ');
  }

  protected formatDefault(value: unknown): string {
    if (typeof value === 'string') return `'${value}'`;
    return String(value);
  }
}
