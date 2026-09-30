import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { A11yTreeService } from './a11y-tree.service.js';
import { PrismRendererService } from '../../services/prism-renderer.service.js';
import type { A11yNode } from './a11y.types.js';

@Component({
  selector: 'prism-a11y-tree-node',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './a11y-tree-node.component.html',
  styleUrl: './a11y-tree-node.component.css',
})
export class A11yTreeNodeComponent {
  readonly node = input.required<A11yNode>();
  readonly depth = input(0);
  readonly isLast = input(false);

  protected readonly expanded = signal(true);
  private lastElement: Element | null = null;

  constructor() {
    effect(() => {
      const el = this.node().element;
      untracked(() => {
        if (this.lastElement !== el) {
          this.lastElement = el;
          this.expanded.set(true);
        }
      });
    });
  }

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
  templateUrl: './a11y-tree.component.html',
  styleUrl: './a11y-tree.component.css',
})
export class A11yTreeComponent {
  protected readonly rendererService = inject(PrismRendererService);
  private readonly treeService = inject(A11yTreeService);

  protected readonly tree = computed(() => {
    const root = this.rendererService.renderedElement();
    if (!root) return null;
    const doc = (root as HTMLElement).ownerDocument;
    return this.treeService.buildTree(
      root,
      doc ? (id) => doc.getElementById(id) : undefined
    );
  });
}
