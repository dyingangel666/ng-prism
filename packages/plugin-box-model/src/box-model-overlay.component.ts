import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent } from 'rxjs';
import type { PrismRendererService } from '@ng-prism/core';
import { getBoxModel } from './box-model-utils.js';
import { BoxModelStateService } from './box-model-state.service.js';

interface BoxStyle {
  left: string;
  top: string;
  width: string;
  height: string;
}

interface BoxStyles {
  margin: BoxStyle;
  border: BoxStyle;
  padding: BoxStyle;
  content: BoxStyle;
}

@Component({
  selector: 'prism-box-model-overlay',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (boxStyles(); as styles) {
      <div class="prism-bm__box prism-bm__box--margin" [style.left]="styles.margin.left" [style.top]="styles.margin.top" [style.width]="styles.margin.width" [style.height]="styles.margin.height">
        @if (labelMargin('top')) { <span class="prism-bm__label prism-bm__label--top">{{ labelMargin('top') }}</span> }
        @if (labelMargin('right')) { <span class="prism-bm__label prism-bm__label--right">{{ labelMargin('right') }}</span> }
        @if (labelMargin('bottom')) { <span class="prism-bm__label prism-bm__label--bottom">{{ labelMargin('bottom') }}</span> }
        @if (labelMargin('left')) { <span class="prism-bm__label prism-bm__label--left">{{ labelMargin('left') }}</span> }
      </div>
      <div class="prism-bm__box prism-bm__box--border" [style.left]="styles.border.left" [style.top]="styles.border.top" [style.width]="styles.border.width" [style.height]="styles.border.height"></div>
      <div class="prism-bm__box prism-bm__box--padding" [style.left]="styles.padding.left" [style.top]="styles.padding.top" [style.width]="styles.padding.width" [style.height]="styles.padding.height">
        @if (labelPadding('top')) { <span class="prism-bm__label prism-bm__label--top">{{ labelPadding('top') }}</span> }
        @if (labelPadding('right')) { <span class="prism-bm__label prism-bm__label--right">{{ labelPadding('right') }}</span> }
        @if (labelPadding('bottom')) { <span class="prism-bm__label prism-bm__label--bottom">{{ labelPadding('bottom') }}</span> }
        @if (labelPadding('left')) { <span class="prism-bm__label prism-bm__label--left">{{ labelPadding('left') }}</span> }
      </div>
      <div class="prism-bm__box prism-bm__box--content" [style.left]="styles.content.left" [style.top]="styles.content.top" [style.width]="styles.content.width" [style.height]="styles.content.height">
        <span class="prism-bm__size">{{ contentSize() }}</span>
      </div>
    }
  `,
  styles: `
    :host {
      position: absolute;
      inset: 0;
      pointer-events: none;
      overflow: hidden;
    }
    .prism-bm__box {
      position: absolute;
      box-sizing: border-box;
    }
    .prism-bm__box--margin  { background: rgba(245, 158, 11, 0.2); outline: 1px solid rgba(245, 158, 11, 0.5); }
    .prism-bm__box--border  { background: rgba(234, 179, 8, 0.3); }
    .prism-bm__box--padding { background: rgba(16, 185, 129, 0.2); outline: 1px solid rgba(16, 185, 129, 0.4); }
    .prism-bm__box--content { background: rgba(59, 130, 246, 0.25); display: flex; align-items: center; justify-content: center; }
    .prism-bm__label {
      position: absolute;
      font-size: 10px;
      font-family: monospace;
      color: #1f2937;
      background: rgba(255,255,255,0.8);
      padding: 0 3px;
      border-radius: 2px;
      white-space: nowrap;
      line-height: 1.4;
    }
    .prism-bm__label--top    { top: 2px; left: 50%; transform: translateX(-50%); }
    .prism-bm__label--bottom { bottom: 2px; left: 50%; transform: translateX(-50%); }
    .prism-bm__label--left   { left: 2px; top: 50%; transform: translateY(-50%); }
    .prism-bm__label--right  { right: 2px; top: 50%; transform: translateY(-50%); }
    .prism-bm__size {
      font-size: 11px;
      font-family: monospace;
      color: #1e3a5f;
      background: rgba(255,255,255,0.85);
      padding: 1px 5px;
      border-radius: 3px;
      white-space: nowrap;
    }
  `,
})
export class BoxModelOverlayComponent {
  private readonly el = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);
  private readonly stateService = inject(BoxModelStateService);
  readonly rendererService = input.required<PrismRendererService>();

  readonly boxStyles = computed<BoxStyles | null>(() => {
    const bm = this.stateService.hoveredBoxModel();
    const canvas = this.el.nativeElement.parentElement;
    if (!bm || !canvas) return null;

    const canvasRect = canvas.getBoundingClientRect();
    const sl = canvas.scrollLeft;
    const st = canvas.scrollTop;
    const { content, padding, border, margin } = bm;

    const bLeft = content.left - canvasRect.left + sl;
    const bTop = content.top - canvasRect.top + st;
    const bW = content.width;
    const bH = content.height;

    return {
      margin: {
        left: `${bLeft - margin.left}px`,
        top: `${bTop - margin.top}px`,
        width: `${bW + margin.left + margin.right}px`,
        height: `${bH + margin.top + margin.bottom}px`,
      },
      border: {
        left: `${bLeft}px`,
        top: `${bTop}px`,
        width: `${bW}px`,
        height: `${bH}px`,
      },
      padding: {
        left: `${bLeft + border.left}px`,
        top: `${bTop + border.top}px`,
        width: `${bW - border.left - border.right}px`,
        height: `${bH - border.top - border.bottom}px`,
      },
      content: {
        left: `${bLeft + border.left + padding.left}px`,
        top: `${bTop + border.top + padding.top}px`,
        width: `${bW - border.left - border.right - padding.left - padding.right}px`,
        height: `${bH - border.top - border.bottom - padding.top - padding.bottom}px`,
      },
    };
  });

  readonly contentSize = computed(() => {
    const bm = this.stateService.hoveredBoxModel();
    if (!bm) return '';
    const { content, border, padding } = bm;
    const w = Math.round(content.width - border.left - border.right - padding.left - padding.right);
    const h = Math.round(content.height - border.top - border.bottom - padding.top - padding.bottom);
    return `${w} × ${h}`;
  });

  labelMargin(side: 'top' | 'right' | 'bottom' | 'left'): string {
    const bm = this.stateService.hoveredBoxModel();
    if (!bm) return '';
    const v = bm.margin[side];
    return v === 0 ? '' : `${v}px`;
  }

  labelPadding(side: 'top' | 'right' | 'bottom' | 'left'): string {
    const bm = this.stateService.hoveredBoxModel();
    if (!bm) return '';
    const v = bm.padding[side];
    return v === 0 ? '' : `${v}px`;
  }

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.stateService.hoveredBoxModel.set(null);
    });

    afterNextRender(() => {
      const canvas = this.el.nativeElement.parentElement;
      if (!canvas) return;

      fromEvent<MouseEvent>(canvas, 'mousemove')
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((event) => this.handleMouseMove(event));

      fromEvent(canvas, 'mouseleave')
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => this.stateService.hoveredBoxModel.set(null));
    });
  }

  private handleMouseMove(event: MouseEvent): void {
    const renderedEl = this.rendererService()?.renderedElement();
    if (!renderedEl) {
      this.stateService.hoveredBoxModel.set(null);
      return;
    }

    const element = document.elementFromPoint(event.clientX, event.clientY);
    if (!element || !renderedEl.contains(element)) {
      this.stateService.hoveredBoxModel.set(null);
      return;
    }

    this.stateService.hoveredBoxModel.set(getBoxModel(element));
  }
}
