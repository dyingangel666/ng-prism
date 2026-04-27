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
    <div class="aria-tree-line" [class.aria-tree-line--hidden]="node().hidden">
      <span class="indent" [style.width.px]="depth() * 20">
        @if (depth() > 0) {
          {{ isLast() ? '└─' : '├─' }}
        }
      </span>
      @if (node().children.length) {
        <button class="tree-toggle" (click)="toggleExpanded()">{{ expanded() ? '▾' : '▸' }}</button>
      }
      <span class="role">{{ node().role }}</span>
      @if (node().name) {
        <span class="name">"{{ node().name }}"</span>
      }
      @for (entry of stateEntries(); track entry.key) {
        <span class="attr">[{{ entry.label }}]</span>
      }
    </div>
    @if (expanded() && node().children.length) {
      @for (child of node().children; track $index; let last = $last) {
        <prism-a11y-tree-node [node]="child" [depth]="depth() + 1" [isLast]="last" />
      }
    }
  `,
  styles: `
    :host { display: block; }

    .aria-tree-line {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 2px 0;
      font-family: var(--font-mono);
      font-size: 12.5px;
      line-height: 1.8;
      color: var(--prism-text-2);
    }
    .aria-tree-line--hidden { opacity: 0.4; }

    .indent {
      color: var(--prism-text-ghost);
      opacity: 0.5;
      user-select: none;
      flex-shrink: 0;
      white-space: pre;
      font-size: 12px;
      text-align: right;
    }

    .tree-toggle {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 10px;
      color: var(--prism-text-muted);
      padding: 0;
      width: 12px;
      flex-shrink: 0;
    }

    .role { color: var(--prism-primary); font-weight: 600; }
    .name { color: var(--prism-text); }
    .attr { color: var(--prism-text-ghost); }
  `,
})
export class A11yTreeNodeComponent {
  readonly node = input.required<A11yNode>();
  readonly depth = input(0);
  readonly isLast = input(false);

  protected readonly expanded = signal(true);

  protected readonly stateEntries = computed(() => {
    const states = this.node().states;
    return Object.entries(states)
      .filter(([key]) => key !== 'hidden')
      .map(([key, value]) => ({
        key,
        label: value === true ? key : `${key}=${value}`,
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
    @if (!rendererService.renderedElement()) {
      <div class="tree-empty">Select a component to inspect the accessibility tree.</div>
    } @else if (tree()) {
      <div class="aria-tree">
        <prism-a11y-tree-node [node]="tree()!" [depth]="0" [isLast]="true" />
      </div>
    }
  `,
  styles: `
    :host { display: block; height: 100%; overflow: auto; }

    .aria-tree {
      padding: 14px 20px;
    }

    .tree-empty {
      display: flex; align-items: center; justify-content: center;
      min-height: 100px; color: var(--prism-text-muted); font-size: 13px;
    }
  `,
})
export class A11yTreeComponent {
  protected readonly rendererService = inject(PrismRendererService);
  private readonly treeService = inject(A11yTreeService);

  readonly activeComponent = input<unknown>(null);

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
