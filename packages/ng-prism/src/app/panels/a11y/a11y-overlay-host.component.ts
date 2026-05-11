import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { A11yKeyboardService } from './a11y-keyboard.service.js';
import { PrismRendererService } from '../../services/prism-renderer.service.js';

interface Bounds {
  top: number;
  left: number;
  width: number;
  height: number;
}

@Component({
  selector: 'prism-a11y-overlay-host',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (bounds(); as b) {
    <div
      class="a11y-mark outline"
      [style.top.px]="b.top"
      [style.left.px]="b.left"
      [style.width.px]="b.width"
      [style.height.px]="b.height"
    ></div>
    @if (roleLabel()) {
    <div
      class="a11y-mark"
      [style.top.px]="b.top - 22"
      [style.left.px]="b.left - 2"
    >
      <span class="tag">{{ roleLabel() }}</span>
    </div>
    } @if (tabLabel()) {
    <div
      class="a11y-mark kb"
      [style.top.px]="b.top + b.height + 4"
      [style.left.px]="b.left + b.width + 2"
      style="transform: translateX(-100%)"
    >
      <span class="tag">{{ tabLabel() }}</span>
    </div>
    } }
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
      color: var(--prism-text-light, #fff);
      font: 11px/1.4 var(--font-mono);
      white-space: nowrap;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
    }
    .kb .tag { background: rgba(5, 150, 105, 0.95); }
  `,
})
export class A11yOverlayHostComponent {
  readonly rendererService = input.required<PrismRendererService>();
  private readonly keyboardService = inject(A11yKeyboardService);
  private readonly elementRef = inject(ElementRef<HTMLElement>);

  private readonly layoutTick = signal(0);

  protected readonly bounds = computed<Bounds | null>(() => {
    const el = this.rendererService().renderedElement();
    this.layoutTick();
    if (!el) return null;
    const parent = this.elementRef.nativeElement.parentElement;
    if (!parent) return null;
    const elRect = (el as HTMLElement).getBoundingClientRect();
    const parentRect = parent.getBoundingClientRect();
    return {
      top: elRect.top - parentRect.top,
      left: elRect.left - parentRect.left,
      width: elRect.width,
      height: elRect.height,
    };
  });

  protected readonly roleLabel = computed(() => {
    const el = this.rendererService().renderedElement();
    if (!el) return null;
    const role = el.getAttribute('role') ?? implicitRole(el);
    return role ? `role="${role}"` : null;
  });

  protected readonly tabLabel = computed(() => {
    const el = this.rendererService().renderedElement();
    if (!el) return null;
    const doc = (el as HTMLElement).ownerDocument;
    const items = this.keyboardService.extractTabOrder(
      el,
      doc ? (id) => doc.getElementById(id) : undefined
    );
    if (items.length === 0) return null;
    return `Tab ${items[0].index}`;
  });

  constructor() {
    effect((onCleanup) => {
      const el = this.rendererService().renderedElement();
      if (!el) return;
      const ro = new ResizeObserver(() => this.layoutTick.update((v) => v + 1));
      ro.observe(el);
      const parent = this.elementRef.nativeElement.parentElement;
      if (parent) ro.observe(parent);
      onCleanup(() => ro.disconnect());
    });

    effect(() => {
      this.rendererService().inputValues();
      this.rendererService().activeVariantIndex();
      this.layoutTick.update((v) => v + 1);
    });
  }
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
