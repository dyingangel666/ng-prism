import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { A11yKeyboardService } from './a11y-keyboard.service.js';
import { PrismRendererService } from '../../services/prism-renderer.service.js';

@Component({
  selector: 'prism-a11y-keyboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (!rendererService.renderedElement()) {
    <div class="kb-empty">
      Select a component to inspect keyboard navigation.
    </div>
    } @else if (!items().length) {
    <div class="kb-empty">No focusable elements found.</div>
    } @else {
    <div class="kb-body">
      @for (item of items(); track item.index) {
      <div class="kb-row">
        <div class="kb-keys">
          <kbd>Tab {{ item.index }}</kbd>
        </div>
        <div class="kb-desc">
          {{
            item.name
              ? '"' + item.name + '"'
              : item.element.tagName.toLowerCase() + typeAttr(item.element)
          }}
          @if (item.states.length) { · {{ item.states.join(', ') }}
          }
        </div>
        <span class="kb-tgt"
          >{{ item.element.tagName.toLowerCase()
          }}{{ typeAttr(item.element) }}</span
        >
      </div>
      }
    </div>
    }
  `,
  styles: `
    :host { display: block; height: 100%; overflow: auto; }

    .kb-empty {
      display: flex; align-items: center; justify-content: center;
      min-height: 100px; color: var(--prism-text-muted); font-size: 13px;
    }

    .kb-body {
      padding: 16px 20px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .kb-row {
      display: grid;
      grid-template-columns: 110px 1fr auto;
      align-items: center;
      gap: 12px;
      padding: 9px 14px;
      background: var(--prism-bg-surface);
      border: 1px solid var(--prism-border);
      border-radius: 8px;
    }

    .kb-keys { display: flex; gap: 4px; }
    .kb-keys kbd {
      font-family: var(--font-mono);
      font-size: 10.5px;
      padding: 1px 5px;
      border-radius: 4px;
      background: var(--prism-input-bg);
      border: 1px solid var(--prism-border);
      color: var(--prism-text-muted);
    }

    .kb-desc {
      font-size: 12.5px;
      color: var(--prism-text-2);
    }

    .kb-tgt {
      font-family: var(--font-mono);
      font-size: 11px;
      color: var(--prism-primary);
      padding: 2px 7px;
      background: color-mix(in srgb, var(--prism-primary) 10%, transparent);
      border-radius: var(--radius-xs);
    }
  `,
})
export class A11yKeyboardComponent {
  protected readonly rendererService = inject(PrismRendererService);
  private readonly keyboardService = inject(A11yKeyboardService);

  readonly activeComponent = input<unknown>(null);

  protected readonly items = computed(() => {
    const root = this.rendererService.renderedElement();
    if (!root) return [];
    const doc = (root as HTMLElement).ownerDocument;
    return this.keyboardService.extractTabOrder(
      root,
      doc ? (id) => doc.getElementById(id) : undefined
    );
  });

  protected typeAttr(el: Element): string {
    const type = el.getAttribute('type');
    return type ? `[type=${type}]` : '';
  }
}
