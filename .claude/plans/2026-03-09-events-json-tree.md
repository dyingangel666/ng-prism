# Events JSON Tree Viewer Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the flat string rendering in the Events panel with an expandable tree viewer that shows objects step-by-step like Chrome DevTools.

**Architecture:** A new standalone `PrismJsonNodeComponent` renders any `unknown` value as a typed node — primitives inline, objects/arrays collapsed with a preview summary, expandable on click. The component imports itself for recursion. The events panel swaps its `formatValue` span for the new component.

**Tech Stack:** Angular 21 standalone components, Signals (`signal()`, `computed()`), CSS Custom Properties from the existing Prism theme.

---

### Task 1: Summary helper function + tests

The collapsed preview (e.g. `{key: "val", …}`) is pure logic — testable without Angular.

**Files:**
- Create: `packages/ng-prism/src/app/panels/events/prism-json-node.component.ts` (stub + helper)
- Create: `packages/ng-prism/src/app/panels/events/prism-json-node.component.spec.ts`

**Step 1: Create the spec file with failing tests**

```typescript
// packages/ng-prism/src/app/panels/events/prism-json-node.component.spec.ts
import { summarizeValue } from './prism-json-node.component.js';

describe('summarizeValue', () => {
  it('renders a string with quotes', () => {
    expect(summarizeValue('hello')).toBe('"hello"');
  });

  it('renders a number as-is', () => {
    expect(summarizeValue(42)).toBe('42');
  });

  it('renders boolean true', () => {
    expect(summarizeValue(true)).toBe('true');
  });

  it('renders null', () => {
    expect(summarizeValue(null)).toBe('null');
  });

  it('renders undefined', () => {
    expect(summarizeValue(undefined)).toBe('undefined');
  });

  it('renders an empty object', () => {
    expect(summarizeValue({})).toBe('{}');
  });

  it('renders an object with one key', () => {
    expect(summarizeValue({ a: 1 })).toBe('{a: 1}');
  });

  it('renders an object with two keys', () => {
    expect(summarizeValue({ a: 1, b: 'x' })).toBe('{a: 1, b: "x"}');
  });

  it('truncates object with more than two keys', () => {
    expect(summarizeValue({ a: 1, b: 2, c: 3 })).toBe('{a: 1, b: 2, …}');
  });

  it('renders an empty array', () => {
    expect(summarizeValue([])).toBe('[]');
  });

  it('renders an array with items (up to 3)', () => {
    expect(summarizeValue([1, 2, 3])).toBe('[1, 2, 3]');
  });

  it('truncates array with more than 3 items', () => {
    expect(summarizeValue([1, 2, 3, 4])).toBe('[1, 2, 3, …]');
  });

  it('nests object values using summarizeValue recursively', () => {
    expect(summarizeValue({ x: { y: 1 } })).toBe('{x: {y: 1}}');
  });
});
```

**Step 2: Run to verify they fail**

```bash
npx nx test ng-prism -- --testPathPatterns=prism-json-node
```

Expected: FAIL — "summarizeValue is not a function" (module doesn't exist yet).

**Step 3: Create stub with the export**

```typescript
// packages/ng-prism/src/app/panels/events/prism-json-node.component.ts
import { Component } from '@angular/core';

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
    const keys = Object.keys(val as object);
    if (keys.length === 0) return '{}';
    const pairs = keys
      .slice(0, 2)
      .map((k) => `${k}: ${summarizeValue((val as Record<string, unknown>)[k])}`);
    return keys.length > 2 ? `{${pairs.join(', ')}, …}` : `{${pairs.join(', ')}}`;
  }
  return String(val);
}

@Component({
  selector: 'prism-json-node',
  standalone: true,
  template: ``,
})
export class PrismJsonNodeComponent {}
```

**Step 4: Run to verify tests pass**

```bash
npx nx test ng-prism -- --testPathPatterns=prism-json-node
```

Expected: All 13 tests PASS.

**Step 5: Commit**

```bash
git add packages/ng-prism/src/app/panels/events/prism-json-node.component.ts \
        packages/ng-prism/src/app/panels/events/prism-json-node.component.spec.ts
git commit -m "feat(events): add summarizeValue helper with tests"
```

---

### Task 2: Implement `PrismJsonNodeComponent`

**Files:**
- Modify: `packages/ng-prism/src/app/panels/events/prism-json-node.component.ts`

**Step 1: Replace the stub component with the full implementation**

Replace the entire file content:

```typescript
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
    const keys = Object.keys(val as object);
    if (keys.length === 0) return '{}';
    const pairs = keys
      .slice(0, 2)
      .map((k) => `${k}: ${summarizeValue((val as Record<string, unknown>)[k])}`);
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
            <span class="json-brace">{'{'}</span>
            <div class="json-children">
              @for (entry of entries(); track entry.key) {
                <div class="json-row">
                  <span class="json-key">{{ entry.key }}</span>
                  <span class="json-colon">:&nbsp;</span>
                  <prism-json-node [value]="entry.value" />
                </div>
              }
            </div>
            <span class="json-brace">{'}'}</span>
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
```

**Step 2: Run tests to confirm they still pass**

```bash
npx nx test ng-prism -- --testPathPatterns=prism-json-node
```

Expected: All 13 tests PASS (the spec only tests `summarizeValue`).

**Step 3: Commit**

```bash
git add packages/ng-prism/src/app/panels/events/prism-json-node.component.ts
git commit -m "feat(events): implement PrismJsonNodeComponent recursive tree viewer"
```

---

### Task 3: Integrate into the Events panel

**Files:**
- Modify: `packages/ng-prism/src/app/panels/events/prism-events-panel.component.ts`

**Step 1: Update the component**

Replace the current `prism-events-panel.component.ts` with:

```typescript
import { Component, inject } from '@angular/core';
import { PrismEventLogService } from '../../services/prism-event-log.service.js';
import { PrismJsonNodeComponent } from './prism-json-node.component.js';

@Component({
  selector: 'prism-events-panel',
  standalone: true,
  imports: [PrismJsonNodeComponent],
  template: `
    <div class="prism-events-panel">
      <div class="prism-events-panel__header">
        <span class="prism-events-panel__title">Events</span>
        <button
          class="prism-events-panel__clear"
          (click)="eventLogService.clear()"
        >
          Clear
        </button>
      </div>
      <div class="prism-events-panel__list">
        @for (entry of eventLogService.events(); track $index) {
          <div class="prism-events-panel__entry">
            <span class="prism-events-panel__time">{{ formatTime(entry.timestamp) }}</span>
            <span class="prism-events-panel__name">{{ entry.name }}</span>
            <span class="prism-events-panel__value">
              <prism-json-node [value]="entry.value" />
            </span>
          </div>
        } @empty {
          <p class="prism-events-panel__empty">No events recorded</p>
        }
      </div>
    </div>
  `,
  styles: `
    .prism-events-panel {
      display: flex;
      flex-direction: column;
      height: 100%;
    }
    .prism-events-panel__header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 16px;
      border-bottom: 1px solid var(--prism-border);
    }
    .prism-events-panel__title {
      font-size: 12px;
      font-weight: 600;
      color: var(--prism-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .prism-events-panel__clear {
      padding: 2px 8px;
      font-size: 12px;
      border: 1px solid var(--prism-border);
      border-radius: var(--prism-radius-sm);
      background: var(--prism-bg);
      color: var(--prism-text-muted);
      cursor: pointer;
    }
    .prism-events-panel__clear:hover {
      color: var(--prism-text);
      border-color: var(--prism-text-muted);
    }
    .prism-events-panel__list {
      overflow-y: auto;
      flex: 1;
    }
    .prism-events-panel__entry {
      display: flex;
      gap: 12px;
      padding: 4px 16px;
      font-size: 12px;
      font-family: var(--prism-font-mono);
      border-bottom: 1px solid var(--prism-border);
      align-items: baseline;
      flex-wrap: wrap;
    }
    .prism-events-panel__time {
      color: var(--prism-text-muted);
      flex-shrink: 0;
    }
    .prism-events-panel__name {
      color: var(--prism-primary);
      font-weight: 600;
      flex-shrink: 0;
    }
    .prism-events-panel__value {
      flex: 1;
      min-width: 0;
    }
    .prism-events-panel__empty {
      color: var(--prism-text-muted);
      font-size: 13px;
      padding: 12px 16px;
      margin: 0;
    }
  `,
})
export class PrismEventsPanelComponent {
  protected readonly eventLogService = inject(PrismEventLogService);

  protected formatTime(ts: number): string {
    const d = new Date(ts);
    return d.toLocaleTimeString('en-US', { hour12: false, fractionalSecondDigits: 3 });
  }
}
```

**Step 2: Run full test suite**

```bash
npx nx test ng-prism
```

Expected: All existing tests PASS (no regressions).

**Step 3: Commit**

```bash
git add packages/ng-prism/src/app/panels/events/prism-events-panel.component.ts
git commit -m "feat(events): integrate JSON tree viewer into events panel"
```
