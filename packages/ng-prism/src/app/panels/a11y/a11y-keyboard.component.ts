import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { A11yKeyboardService } from './a11y-keyboard.service.js';
import { PrismRendererService } from '../../services/prism-renderer.service.js';

@Component({
  selector: 'prism-a11y-keyboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="prism-a11y-kbd">
      @if (!rendererService.renderedElement()) {
        <div class="prism-a11y-kbd__empty">Select a component to inspect keyboard navigation.</div>
      } @else if (!items().length) {
        <div class="prism-a11y-kbd__empty">No focusable elements found.</div>
      } @else {
        <div class="prism-a11y-kbd__header">
          <span>{{ items().length }} fokussierbare Elemente</span>
          <span class="prism-a11y-kbd__overlay-badge">● Overlay aktiv</span>
        </div>
        <div class="prism-a11y-kbd__list">
          @for (item of items(); track item.index) {
            <div class="prism-a11y-kbd__item">
              <div class="prism-a11y-kbd__num">{{ item.index }}</div>
              <div class="prism-a11y-kbd__info">
                <span class="prism-a11y-kbd__tag">{{ item.element.tagName.toLowerCase() }}{{ typeAttr(item.element) }}</span>
                @if (item.name) {
                  <span class="prism-a11y-kbd__name">"{{ item.name }}"</span>
                  <span class="prism-a11y-kbd__source">via {{ item.nameSource }}</span>
                }
                @if (item.states.length) {
                  <div class="prism-a11y-kbd__states">
                    @for (s of item.states; track s) {
                      <span class="prism-a11y-kbd__state">{{ s }}</span>
                    }
                  </div>
                }
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: `
    :host { display: flex; flex-direction: column; height: 100%; }

    .prism-a11y-kbd { height: 100%; display: flex; flex-direction: column; }

    .prism-a11y-kbd__empty {
      display: flex; align-items: center; justify-content: center;
      min-height: 100px; color: var(--prism-text-muted); font-size: 13px;
    }

    .prism-a11y-kbd__header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      border-bottom: 1px solid var(--prism-border);
      font-size: 12px;
      color: var(--prism-text-muted);
      flex-shrink: 0;
    }

    .prism-a11y-kbd__overlay-badge {
      margin-left: auto;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 11px;
      font-weight: 600;
      background: color-mix(in srgb, #818cf8 12%, transparent);
      color: #818cf8;
      border: 1px solid color-mix(in srgb, #818cf8 22%, transparent);
    }

    .prism-a11y-kbd__list { flex: 1; overflow: auto; }

    .prism-a11y-kbd__item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 10px 16px;
      border-bottom: 1px solid var(--prism-border);
    }
    .prism-a11y-kbd__item:hover { background: rgba(129, 140, 248, 0.04); }

    .prism-a11y-kbd__num {
      width: 20px; height: 20px;
      background: #818cf8;
      color: white;
      border-radius: 50%;
      font-size: 10px; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; margin-top: 1px;
      font-family: var(--prism-font-sans, system-ui, sans-serif);
    }

    .prism-a11y-kbd__info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .prism-a11y-kbd__tag {
      font-family: var(--prism-font-mono, monospace);
      font-size: 12px;
      color: var(--prism-primary);
    }

    .prism-a11y-kbd__name {
      font-size: 12px;
      color: var(--prism-text-2);
    }

    .prism-a11y-kbd__source {
      font-size: 11px;
      color: var(--prism-text-muted);
    }

    .prism-a11y-kbd__states {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-top: 2px;
    }

    .prism-a11y-kbd__state {
      padding: 0 5px;
      border-radius: 3px;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      background: color-mix(in srgb, #fbbf24 12%, transparent);
      color: #fbbf24;
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
      doc ? (id) => doc.getElementById(id) : undefined,
    );
  });

  protected typeAttr(el: Element): string {
    const type = el.getAttribute('type');
    return type ? `[type=${type}]` : '';
  }
}
