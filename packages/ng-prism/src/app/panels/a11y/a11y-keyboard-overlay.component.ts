import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  inject,
  signal,
} from '@angular/core';
import { A11yKeyboardService } from './a11y-keyboard.service.js';
import { A11yPanelStateService } from './a11y-panel-state.service.js';
import { PrismRendererService } from '../../services/prism-renderer.service.js';

export interface BadgePosition {
  index: number;
  name: string;
  role: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

@Component({
  selector: 'prism-a11y-kbd-overlay',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (panelState.activeTab() === 'keyboard') {
      @for (badge of badges(); track badge.index) {
        <div
          class="prism-a11y-kbd-ov__highlight"
          [style.left.px]="badge.x"
          [style.top.px]="badge.y"
          [style.width.px]="badge.width"
          [style.height.px]="badge.height"
          [title]="badge.name || badge.role"
        ></div>
        <div
          class="prism-a11y-kbd-ov__badge"
          [style.left.px]="badge.x - 10"
          [style.top.px]="badge.y - 10"
        >{{ badge.index }}</div>
      }
    }
  `,
  styles: `
    :host {
      position: absolute;
      inset: 0;
      pointer-events: none;
      z-index: 100;
      overflow: hidden;
    }

    .prism-a11y-kbd-ov__highlight {
      position: absolute;
      border: 2px solid rgba(129, 140, 248, 0.5);
      border-radius: 4px;
      background: rgba(129, 140, 248, 0.06);
      box-shadow: 0 0 0 4px rgba(129, 140, 248, 0.08);
      pointer-events: none;
    }

    .prism-a11y-kbd-ov__badge {
      position: absolute;
      width: 20px;
      height: 20px;
      background: var(--prism-primary);
      color: white;
      border-radius: 50%;
      font-size: 10px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 0 2px white, 0 2px 6px rgba(0, 0, 0, 0.3);
      font-family: var(--prism-font-sans, system-ui, sans-serif);
      pointer-events: auto;
      cursor: default;
    }
  `,
})
export class A11yKeyboardOverlayComponent {
  protected readonly panelState = inject(A11yPanelStateService);
  private readonly rendererService = inject(PrismRendererService);
  private readonly keyboardService = inject(A11yKeyboardService);
  private readonly elementRef = inject(ElementRef<HTMLElement>);

  protected readonly badges = signal<BadgePosition[]>([]);

  private rafId: number | null = null;

  constructor() {
    effect(() => {
      const root = this.rendererService.renderedElement();
      this.rendererService.inputValues();
      this.rendererService.activeVariantIndex();
      const isKeyboard = this.panelState.activeTab() === 'keyboard';

      if (!root || !isKeyboard) {
        this.badges.set([]);
        return;
      }

      if (this.rafId !== null) cancelAnimationFrame(this.rafId);
      this.rafId = requestAnimationFrame(() => {
        this.rafId = null;
        this.computeBadges(root);
      });
    });
  }

  private computeBadges(root: Element): void {
    const canvas = this.elementRef.nativeElement.closest('.prism-renderer__canvas') as HTMLElement | null;
    if (!canvas) return;

    const doc = (root as HTMLElement).ownerDocument;
    const items = this.keyboardService.extractTabOrder(
      root,
      doc ? (id) => doc.getElementById(id) : undefined,
    );

    const canvasRect = canvas.getBoundingClientRect();
    const scrollLeft = canvas.scrollLeft;
    const scrollTop = canvas.scrollTop;

    const positions: BadgePosition[] = items.map((item) => {
      const elRect = (item.element as HTMLElement).getBoundingClientRect();
      return {
        index: item.index,
        name: item.name,
        role: item.role,
        x: elRect.left - canvasRect.left + scrollLeft,
        y: elRect.top - canvasRect.top + scrollTop,
        width: elRect.width,
        height: elRect.height,
      };
    });

    this.badges.set(positions);
  }
}
