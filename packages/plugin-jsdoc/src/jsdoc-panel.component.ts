import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { Highlight } from 'ngx-highlightjs';
import type { InputMeta, OutputMeta } from '@ng-prism/core/plugin';
import type { JsDocData, MethodDoc } from './jsdoc.types.js';

@Component({
  selector: 'prism-jsdoc-panel',
  standalone: true,
  imports: [Highlight],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="prism-jsdoc-panel">
      @if (!activeComponent()) {
      <div class="prism-jsdoc-panel__empty">
        Select a component to view API documentation.
      </div>
      } @else { @if (classDescription()) {
      <p class="prism-jsdoc-panel__description">{{ classDescription() }}</p>
      } @if (hasTags()) {
      <div class="prism-jsdoc-panel__meta">
        @if (isDeprecated()) {
        <span
          class="prism-jsdoc-panel__badge prism-jsdoc-panel__badge--deprecated"
        >
          Deprecated{{ deprecatedMessage() ? ': ' + deprecatedMessage() : '' }}
        </span>
        } @if (since()) {
        <span class="prism-jsdoc-panel__meta-item">
          <span class="prism-jsdoc-panel__meta-label">Since:</span>
          {{ since() }}
        </span>
        } @for (ref of seeRefs(); track $index) {
        <span class="prism-jsdoc-panel__meta-item">
          <span class="prism-jsdoc-panel__meta-label">See:</span> {{ ref }}
        </span>
        }
      </div>
      } @if (examples().length) {
      <div class="prism-jsdoc-panel__section">
        <h3 class="prism-jsdoc-panel__heading">Examples</h3>
        @for (example of examples(); track $index) {
        <pre
          class="prism-jsdoc-panel__code"
        ><code [highlight]="example" language="typescript"></code></pre>
        }
      </div>
      } @if (inputs().length) {
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
            <tr
              [class.prism-jsdoc-panel__row--deprecated]="
                isMemberDeprecated(inp.name)
              "
            >
              <td class="prism-jsdoc-panel__cell--name">
                <code>{{ inp.name }}</code>
                @if (isMemberDeprecated(inp.name)) {
                <span
                  class="prism-jsdoc-panel__badge prism-jsdoc-panel__badge--deprecated prism-jsdoc-panel__badge--small"
                  >deprecated</span
                >
                }
              </td>
              <td class="prism-jsdoc-panel__cell--type">
                <code>{{ inp.rawType ?? inp.type }}</code>
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
                <span
                  class="prism-jsdoc-panel__badge prism-jsdoc-panel__badge--required"
                  >required</span
                >
                } @else {
                <span class="prism-jsdoc-panel__muted">—</span>
                }
              </td>
              <td class="prism-jsdoc-panel__cell--doc">
                {{
                  inp.doc ?? getMemberSince(inp.name)
                    ? memberDocLine(inp.name, inp.doc)
                    : ''
                }}
              </td>
            </tr>
            }
          </tbody>
        </table>
      </div>
      } @if (outputs().length) {
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
            <tr
              [class.prism-jsdoc-panel__row--deprecated]="
                isMemberDeprecated(out.name)
              "
            >
              <td class="prism-jsdoc-panel__cell--name">
                <code>{{ out.name }}</code>
                @if (isMemberDeprecated(out.name)) {
                <span
                  class="prism-jsdoc-panel__badge prism-jsdoc-panel__badge--deprecated prism-jsdoc-panel__badge--small"
                  >deprecated</span
                >
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
      } @if (methods().length) {
      <div class="prism-jsdoc-panel__section">
        <h3 class="prism-jsdoc-panel__heading">Methods</h3>
        <table class="prism-jsdoc-panel__table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Parameters</th>
              <th>Returns</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            @for (method of methods(); track method.name) {
            <tr
              [class.prism-jsdoc-panel__row--deprecated]="
                !!method.tags.deprecated
              "
            >
              <td class="prism-jsdoc-panel__cell--name">
                <code>{{ method.name }}()</code>
                @if (method.tags.deprecated) {
                <span
                  class="prism-jsdoc-panel__badge prism-jsdoc-panel__badge--deprecated prism-jsdoc-panel__badge--small"
                  >deprecated</span
                >
                }
              </td>
              <td class="prism-jsdoc-panel__cell--type">
                @if (method.params.length) { @for (p of method.params; track
                p.name) {
                <div>
                  <code>{{ p.name }}{{ p.type ? ': ' + p.type : '' }}</code>
                </div>
                } } @else {
                <span class="prism-jsdoc-panel__muted">—</span>
                }
              </td>
              <td class="prism-jsdoc-panel__cell--type">
                @if (method.returnType) {
                <code>{{ method.returnType }}</code>
                } @else {
                <span class="prism-jsdoc-panel__muted">void</span>
                }
              </td>
              <td class="prism-jsdoc-panel__cell--doc">
                {{ method.description ?? '' }}
              </td>
            </tr>
            }
          </tbody>
        </table>
      </div>
      } }
    </div>
  `,
  styles: `
    :host { display: block; height: 100%; overflow: auto; }
    .prism-jsdoc-panel {
      padding: 20px 24px;
      max-width: 880px;
      font-family: var(--font-sans);
      font-size: var(--fs-md);
      color: var(--prism-text);
    }
    .prism-jsdoc-panel__empty {
      display: flex; align-items: center; justify-content: center;
      min-height: 120px; color: var(--prism-text-muted);
    }
    .prism-jsdoc-panel__description {
      margin: 0 0 18px;
      font-size: 14px;
      line-height: 1.7;
      color: var(--prism-text-2);
    }
    .prism-jsdoc-panel__meta {
      display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 18px;
    }
    .prism-jsdoc-panel__meta-item {
      display: flex; align-items: center; gap: 6px;
      padding: 3px 9px; border-radius: 4px;
      background: var(--prism-input-bg);
      border: 1px solid var(--prism-border);
      font-size: var(--fs-sm); color: var(--prism-text-2);
    }
    .prism-jsdoc-panel__meta-label {
      font-weight: 500; color: var(--prism-primary);
      font-family: var(--font-mono);
    }
    .prism-jsdoc-panel__badge {
      display: inline-flex; align-items: center;
      padding: 2px 8px; border-radius: 10px;
      font-size: 12px; font-weight: 600;
    }
    .prism-jsdoc-panel__badge--deprecated {
      background: color-mix(in srgb, var(--prism-warn) 15%, transparent);
      color: var(--prism-warn);
    }
    .prism-jsdoc-panel__badge--required {
      color: var(--prism-accent); font-weight: 700; margin-left: 4px;
    }
    .prism-jsdoc-panel__badge--small { padding: 1px 5px; font-size: 10px; margin-left: 4px; }
    .prism-jsdoc-panel__section { margin-bottom: 20px; }
    .prism-jsdoc-panel__heading {
      font-size: 11px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.08em; margin: 22px 0 10px;
      color: var(--prism-text-ghost);
    }
    .prism-jsdoc-panel__code {
      margin: 0 0 8px; padding: 0;
      background: var(--prism-bg-surface);
      border: 1px solid var(--prism-border);
      border-radius: 8px; overflow: auto;
    }
    .prism-jsdoc-panel__code code {
      font-family: var(--font-mono);
      font-size: var(--fs-sm); line-height: 1.5;
      padding: 8px 12px; display: block;
    }
    .prism-jsdoc-panel__table {
      width: 100%; border-collapse: collapse;
      font-size: var(--fs-md);
      border: 1px solid var(--prism-border);
      border-radius: 8px; overflow: hidden;
    }
    .prism-jsdoc-panel__table th {
      text-align: left; padding: 8px 12px;
      background: var(--prism-bg-surface);
      font-size: 10.5px; text-transform: uppercase;
      letter-spacing: 0.06em; font-weight: 700;
      color: var(--prism-text-ghost);
      border-bottom: 1px solid var(--prism-border);
    }
    .prism-jsdoc-panel__table td {
      padding: 10px 12px;
      border-bottom: 1px solid var(--prism-border);
      vertical-align: top;
    }
    .prism-jsdoc-panel__table tr:last-child td { border-bottom: 0; }
    .prism-jsdoc-panel__row--deprecated td { opacity: 0.6; }
    .prism-jsdoc-panel__cell--name code,
    .prism-jsdoc-panel__cell--type code,
    .prism-jsdoc-panel__cell--default code {
      font-family: var(--font-mono);
      font-size: var(--fs-sm); color: var(--prism-primary);
      background: color-mix(in srgb, var(--prism-primary) 8%, transparent);
      padding: 1px 5px; border-radius: var(--radius-xs);
    }
    .prism-jsdoc-panel__muted { color: var(--prism-text-muted); }
    .prism-jsdoc-panel__cell--doc { color: var(--prism-text); line-height: 1.4; }
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

  protected readonly classDescription = computed(
    () => this.jsdocData()?.classDescription
  );

  protected readonly classTags = computed(
    () => this.jsdocData()?.classTags ?? {}
  );

  protected readonly isDeprecated = computed(
    () => !!this.classTags().deprecated
  );

  protected readonly deprecatedMessage = computed(() => {
    const d = this.classTags().deprecated;
    return typeof d === 'string' ? d : undefined;
  });

  protected readonly since = computed(() => this.classTags().since);

  protected readonly seeRefs = computed(() => this.classTags().see ?? []);

  protected readonly examples = computed(() => this.classTags().example ?? []);

  protected readonly methods = computed<MethodDoc[]>(
    () => this.jsdocData()?.methods ?? []
  );

  protected readonly hasTags = computed(
    () => this.isDeprecated() || !!this.since() || this.seeRefs().length > 0
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
