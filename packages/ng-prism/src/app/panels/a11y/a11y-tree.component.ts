import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { A11yTreeService } from './a11y-tree.service.js';
import { PrismRendererService } from '../../services/prism-renderer.service.js';
import type { A11yNode } from './a11y.types.js';

@Component({
  selector: 'prism-a11y-tree-node',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="prism-a11y-tn">
      <button
        class="prism-a11y-tn__row"
        [class.prism-a11y-tn__row--hidden]="node().hidden"
        (click)="toggleExpanded()"
      >
        <span class="prism-a11y-tn__indent" [style.width.px]="depth() * 16"></span>
        @if (node().children.length) {
          <span class="prism-a11y-tn__chevron">{{ expanded() ? '▾' : '▸' }}</span>
        } @else {
          <span class="prism-a11y-tn__chevron prism-a11y-tn__chevron--leaf">·</span>
        }
        <span class="prism-a11y-tn__role">{{ node().role }}</span>
        @if (node().name) {
          <span class="prism-a11y-tn__name"> "{{ node().name }}"</span>
        }
        @for (entry of stateEntries(); track entry.key) {
          <span class="prism-a11y-tn__state">{{ entry.label }}</span>
        }
      </button>

      @if (expanded() && node().children.length) {
        @for (child of visibleChildren(); track $index) {
          <prism-a11y-tree-node [node]="child" [depth]="depth() + 1" />
        }
        @if (hiddenChildren().length) {
          <div class="prism-a11y-tn__hidden-group" [style.padding-left.px]="(depth() + 1) * 16 + 24">
            <span class="prism-a11y-tn__hidden-label">
              {{ hiddenChildren().length }} hidden element{{ hiddenChildren().length > 1 ? 's' : '' }} (aria-hidden)
            </span>
          </div>
        }
      }
    </div>
  `,
  styles: `
    :host { display: block; }

    .prism-a11y-tn__row {
      width: 100%;
      display: flex;
      align-items: center;
      padding: 3px 12px 3px 4px;
      gap: 0;
      background: none;
      border: none;
      cursor: pointer;
      text-align: left;
      font-family: var(--prism-font-mono, monospace);
      font-size: 12px;
      line-height: 1.5;
      border-radius: 3px;
      transition: background 0.1s;
      white-space: nowrap;
    }
    .prism-a11y-tn__row:hover { background: rgba(255, 255, 255, 0.04); }
    .prism-a11y-tn__row--hidden { opacity: 0.4; }

    .prism-a11y-tn__indent { display: inline-block; flex-shrink: 0; }

    .prism-a11y-tn__chevron {
      display: inline-flex;
      width: 16px;
      justify-content: center;
      font-size: 10px;
      color: var(--prism-text-muted);
      flex-shrink: 0;
    }
    .prism-a11y-tn__chevron--leaf { opacity: 0.3; }

    .prism-a11y-tn__role {
      color: var(--prism-primary);
      font-weight: 600;
    }

    .prism-a11y-tn__name {
      color: var(--prism-text-2);
      margin-left: 4px;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 240px;
    }

    .prism-a11y-tn__state {
      display: inline-flex;
      align-items: center;
      margin-left: 6px;
      padding: 0 5px;
      border-radius: 3px;
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.04em;
      background: color-mix(in srgb, #fbbf24 12%, transparent);
      color: #fbbf24;
      font-family: var(--prism-font-sans, system-ui, sans-serif);
    }

    .prism-a11y-tn__hidden-group {
      padding-top: 2px;
      padding-bottom: 2px;
    }

    .prism-a11y-tn__hidden-label {
      font-size: 11px;
      color: var(--prism-text-muted);
      font-style: italic;
      font-family: var(--prism-font-sans, system-ui, sans-serif);
    }
  `,
})
export class A11yTreeNodeComponent {
  readonly node = input.required<A11yNode>();
  readonly depth = input(0);

  protected readonly expanded = signal(true);

  protected readonly visibleChildren = computed(() =>
    this.node().children.filter((c) => !c.hidden),
  );

  protected readonly hiddenChildren = computed(() =>
    this.node().children.filter((c) => c.hidden),
  );

  protected readonly stateEntries = computed(() => {
    const states = this.node().states;
    return Object.entries(states)
      .filter(([key]) => key !== 'hidden')
      .map(([key, value]) => ({
        key,
        label: value === true ? key : `${key}:${value}`,
      }));
  });

  protected toggleExpanded(): void {
    if (this.node().children.length) {
      this.expanded.update((v) => !v);
    }
  }
}

@Component({
  selector: 'prism-a11y-tree',
  standalone: true,
  imports: [A11yTreeNodeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="prism-a11y-tree">
      @if (!rendererService.renderedElement()) {
        <div class="prism-a11y-tree__empty">Select a component to inspect the accessibility tree.</div>
      } @else {
        <div class="prism-a11y-tree__header">
          <span>Accessibility tree</span>
          <button class="prism-a11y-tree__expand-btn" (click)="expandAll.update(v => !v)">
            {{ expandAll() ? 'Collapse all' : 'Expand all' }}
          </button>
        </div>
        <div class="prism-a11y-tree__content">
          @if (tree()) {
            <prism-a11y-tree-node [node]="tree()!" [depth]="0" />
          }
        </div>
      }
    </div>
  `,
  styles: `
    :host { display: flex; flex-direction: column; height: 100%; }

    .prism-a11y-tree {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .prism-a11y-tree__empty {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100px;
      color: var(--prism-text-muted);
      font-size: 13px;
    }

    .prism-a11y-tree__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 16px;
      border-bottom: 1px solid var(--prism-border);
      font-size: 12px;
      color: var(--prism-text-muted);
      flex-shrink: 0;
    }

    .prism-a11y-tree__expand-btn {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 11px;
      color: var(--prism-primary);
      font-family: var(--prism-font-sans, system-ui, sans-serif);
      padding: 2px 6px;
    }
    .prism-a11y-tree__expand-btn:hover { text-decoration: underline; }

    .prism-a11y-tree__content {
      flex: 1;
      overflow: auto;
      padding: 8px 4px;
    }
  `,
})
export class A11yTreeComponent {
  protected readonly rendererService = inject(PrismRendererService);
  private readonly treeService = inject(A11yTreeService);

  readonly activeComponent = input<unknown>(null);

  protected readonly expandAll = signal(true);

  protected readonly tree = computed(() => {
    const root = this.rendererService.renderedElement();
    if (!root) return null;
    const doc = (root as HTMLElement).ownerDocument;
    return this.treeService.buildTree(
      root,
      doc ? (id) => doc.getElementById(id) : undefined,
    );
  });
}
