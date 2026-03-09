import { Component, computed, input, signal } from '@angular/core';

export function summarizeValue(val: unknown): string {
  if (val === undefined) return 'undefined';
  if (val === null) return 'null';
  if (typeof val === 'string') return `"${val}"`;
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (Array.isArray(val)) {
    if (val.length === 0) return '[]';
    const items = val.slice(0, 3).map(summarizeValue);
    return val.length > 3 ? `[${items.join(', ')}, …]` : `[${items.join(', ')}]`;
  }
  if (typeof val === 'object') {
    const obj = val as Record<string, unknown>;
    const keys = Object.keys(obj);
    if (keys.length === 0) return '{}';
    const pairs = keys.slice(0, 2).map((k) => `${k}: ${summarizeValue(obj[k])}`);
    return keys.length > 2 ? `{${pairs.join(', ')}, …}` : `{${pairs.join(', ')}}`;
  }
  return String(val);
}

type JsonNodeType = 'string' | 'number' | 'boolean' | 'null' | 'undefined' | 'object' | 'array';

function getType(val: unknown): JsonNodeType {
  if (val === null) return 'null';
  if (val === undefined) return 'undefined';
  if (Array.isArray(val)) return 'array';
  return typeof val as JsonNodeType;
}

@Component({
  selector: 'prism-json-node',
  standalone: true,
  imports: [PrismJsonNodeComponent],
  template: `
    @switch (type()) {
      @case ('object') {
        @if (entries().length === 0) {
          <span class="json-brace">{}</span>
        } @else {
          <span class="json-expandable" (click)="toggle()">
            <span class="json-chevron">{{ expanded() ? '▾' : '▸' }}</span>
            @if (!expanded()) {
              <span class="json-summary">{{ summary() }}</span>
            }
          </span>
          @if (expanded()) {
            <span class="json-brace">&#123;</span>
            <div class="json-children">
              @for (entry of entries(); track entry.key) {
                <div class="json-row">
                  <span class="json-key">{{ entry.key }}</span>
                  <span class="json-colon">:&nbsp;</span>
                  <prism-json-node [value]="entry.value" />
                </div>
              }
            </div>
            <span class="json-brace">&#125;</span>
          }
        }
      }
      @case ('array') {
        @if (items().length === 0) {
          <span class="json-brace">[]</span>
        } @else {
          <span class="json-expandable" (click)="toggle()">
            <span class="json-chevron">{{ expanded() ? '▾' : '▸' }}</span>
            @if (!expanded()) {
              <span class="json-summary">{{ summary() }}</span>
            }
          </span>
          @if (expanded()) {
            <span class="json-brace">[</span>
            <div class="json-children">
              @for (item of items(); track $index) {
                <div class="json-row">
                  <span class="json-index">{{ $index }}</span>
                  <span class="json-colon">:&nbsp;</span>
                  <prism-json-node [value]="item" />
                </div>
              }
            </div>
            <span class="json-brace">]</span>
          }
        }
      }
      @case ('string') {
        <span class="json-string">"{{ value() }}"</span>
      }
      @case ('number') {
        <span class="json-number">{{ value() }}</span>
      }
      @case ('boolean') {
        <span class="json-boolean">{{ value() }}</span>
      }
      @case ('null') {
        <span class="json-null">null</span>
      }
      @case ('undefined') {
        <span class="json-undefined">undefined</span>
      }
    }
  `,
  styles: `
    :host {
      display: inline;
      font-family: var(--prism-font-mono, monospace);
      font-size: 12px;
    }
    .json-expandable {
      cursor: pointer;
      user-select: none;
      display: inline-flex;
      align-items: baseline;
      gap: 2px;
    }
    .json-expandable:hover .json-summary {
      opacity: 0.8;
    }
    .json-chevron {
      color: var(--prism-text-muted);
      font-size: 10px;
      width: 10px;
      flex-shrink: 0;
    }
    .json-summary {
      color: var(--prism-text-muted);
    }
    .json-children {
      display: block;
      padding-left: 16px;
      border-left: 1px solid var(--prism-border);
      margin: 2px 0;
    }
    .json-row {
      display: flex;
      align-items: baseline;
      flex-wrap: wrap;
      gap: 0;
      padding: 1px 0;
    }
    .json-key {
      color: var(--prism-text-muted);
    }
    .json-index {
      color: var(--prism-text-muted);
      font-style: italic;
    }
    .json-colon {
      color: var(--prism-text-muted);
    }
    .json-brace {
      color: var(--prism-text-muted);
    }
    .json-string {
      color: #7dd3fc;
    }
    .json-number {
      color: #fb923c;
    }
    .json-boolean {
      color: #c084fc;
    }
    .json-null,
    .json-undefined {
      color: var(--prism-text-muted);
      font-style: italic;
    }
  `,
})
export class PrismJsonNodeComponent {
  readonly value = input<unknown>(undefined);

  protected readonly type = computed(() => getType(this.value()));
  protected readonly expanded = signal(false);

  protected readonly entries = computed<{ key: string; value: unknown }[]>(() => {
    const v = this.value();
    if (typeof v !== 'object' || v === null || Array.isArray(v)) return [];
    return Object.entries(v as Record<string, unknown>).map(([key, value]) => ({ key, value }));
  });

  protected readonly items = computed<unknown[]>(() => {
    const v = this.value();
    return Array.isArray(v) ? v : [];
  });

  protected readonly summary = computed(() => summarizeValue(this.value()));

  protected toggle(): void {
    this.expanded.update((v) => !v);
  }
}
