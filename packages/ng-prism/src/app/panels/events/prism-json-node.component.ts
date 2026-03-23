import { Component, computed, input, signal, Type } from '@angular/core';

const MAX_DEPTH = 10;
const MAX_ENTRIES = 50;
import { NgComponentOutlet } from '@angular/common';
import { summarizeValue } from './prism-json-node.utils.js';

export { summarizeValue } from './prism-json-node.utils.js';

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
  imports: [NgComponentOutlet],
  template: `
    @switch (type()) {
      @case ('object') {
        @if (entries().length === 0) {
          <span class="json-brace">{{ '{}' }}</span>
        } @else {
          <span class="json-expandable" (click)="toggle()">
            <span class="json-chevron">{{ expanded() ? '▾' : '▸' }}</span>
            @if (!expanded()) {
              <span class="json-summary">{{ summary() }}</span>
            }
          </span>
          @if (expanded()) {
            @if (depth() >= maxDepth) {
              <span class="json-summary">…</span>
            } @else {
              <span class="json-brace">{{ '{' }}</span>
              <div class="json-children">
                @for (entry of entries(); track entry.key) {
                  <div class="json-row">
                    <span class="json-key">{{ entry.key }}</span>
                    <span class="json-colon">:&nbsp;</span>
                    <ng-container
                      [ngComponentOutlet]="self"
                      [ngComponentOutletInputs]="{ value: entry.value, depth: depth() + 1 }"
                    />
                  </div>
                }
              </div>
              <span class="json-brace">{{ '}' }}</span>
            }
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
            @if (depth() >= maxDepth) {
              <span class="json-summary">…</span>
            } @else {
              <span class="json-brace">[</span>
              <div class="json-children">
                @for (item of items(); track $index) {
                  <div class="json-row">
                    <span class="json-index">{{ $index }}</span>
                    <span class="json-colon">:&nbsp;</span>
                    <ng-container
                      [ngComponentOutlet]="self"
                      [ngComponentOutletInputs]="{ value: item, depth: depth() + 1 }"
                    />
                  </div>
                }
              </div>
              <span class="json-brace">]</span>
            }
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
  readonly depth = input<number>(0);

  protected readonly maxDepth = MAX_DEPTH;
  protected readonly self: Type<PrismJsonNodeComponent> = PrismJsonNodeComponent;

  protected readonly type = computed(() => getType(this.value()));
  protected readonly expanded = signal(false);

  protected readonly entries = computed<{ key: string; value: unknown }[]>(() => {
    const v = this.value();
    if (typeof v !== 'object' || v === null || Array.isArray(v)) return [];
    try {
      return Object.entries(v as Record<string, unknown>)
        .slice(0, MAX_ENTRIES)
        .map(([key, value]) => ({ key, value }));
    } catch {
      return [];
    }
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
