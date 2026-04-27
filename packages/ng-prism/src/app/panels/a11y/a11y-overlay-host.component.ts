import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { A11yKeyboardService } from './a11y-keyboard.service.js';
import { PrismRendererService } from '../../services/prism-renderer.service.js';

@Component({
  selector: 'prism-a11y-overlay-host',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="a11y-mark outline" style="inset: 0"></div>
    @if (roleLabel()) {
    <div class="a11y-mark" style="top: -22px; left: -2px">
      <span class="tag">{{ roleLabel() }}</span>
    </div>
    } @if (tabLabel()) {
    <div class="a11y-mark kb" style="bottom: -24px; right: -2px">
      <span class="tag">{{ tabLabel() }}</span>
    </div>
    }
  `,
  styles: `
    :host { display: contents; }
    .a11y-mark {
      position: absolute;
      pointer-events: none;
      z-index: 1;
    }
    .outline {
      border: 2px solid rgba(59, 130, 246, 0.95);
      border-radius: 4px;
      background: rgba(59, 130, 246, 0.08);
    }
    .tag {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      background: rgba(17, 24, 39, 0.92);
      color: #fff;
      font: 11px/1.4 var(--font-mono);
      white-space: nowrap;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
    }
    .kb .tag { background: rgba(5, 150, 105, 0.95); }
  `,
})
export class A11yOverlayHostComponent {
  private readonly rendererService = inject(PrismRendererService);
  private readonly keyboardService = inject(A11yKeyboardService);

  protected readonly roleLabel = computed(() => {
    const el = this.rendererService.renderedElement();
    if (!el) return null;
    const role = el.getAttribute('role') ?? implicitRole(el);
    return role ? `role="${role}"` : null;
  });

  protected readonly tabLabel = computed(() => {
    const el = this.rendererService.renderedElement();
    if (!el) return null;
    const doc = (el as HTMLElement).ownerDocument;
    const items = this.keyboardService.extractTabOrder(
      el,
      doc ? (id) => doc.getElementById(id) : undefined
    );
    if (items.length === 0) return null;
    return `Tab ${items[0].index}`;
  });
}

function implicitRole(el: Element): string | null {
  const tag = el.tagName.toLowerCase();
  if (tag === 'button') return 'button';
  if (tag === 'a' && el.hasAttribute('href')) return 'link';
  if (tag === 'input') {
    const type = el.getAttribute('type') ?? 'text';
    if (type === 'checkbox') return 'checkbox';
    if (type === 'radio') return 'radio';
    if (type === 'range') return 'slider';
    return 'textbox';
  }
  if (tag === 'select') return 'combobox';
  if (tag === 'textarea') return 'textbox';
  if (tag === 'img') return 'img';
  return null;
}
