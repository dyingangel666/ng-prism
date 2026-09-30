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
  templateUrl: './box-model-overlay.component.html',
  styleUrl: './box-model-overlay.component.css',
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
        width: `${
          bW - border.left - border.right - padding.left - padding.right
        }px`,
        height: `${
          bH - border.top - border.bottom - padding.top - padding.bottom
        }px`,
      },
    };
  });

  readonly contentSize = computed(() => {
    const bm = this.stateService.hoveredBoxModel();
    if (!bm) return '';
    const { content, border, padding } = bm;
    const w = Math.round(
      content.width - border.left - border.right - padding.left - padding.right
    );
    const h = Math.round(
      content.height - border.top - border.bottom - padding.top - padding.bottom
    );
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
