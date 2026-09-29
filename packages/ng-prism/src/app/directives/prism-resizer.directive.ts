import { Directive, ElementRef, inject, input, output } from '@angular/core';
import { resizeStep, resizeValue } from './resize-value.js';

@Directive({
  selector: '[prismResizer]',
  standalone: true,
  host: {
    '[style.cursor]': 'axis() === "x" ? "col-resize" : "row-resize"',
    '[attr.role]': '"separator"',
    '[attr.aria-orientation]': 'axis() === "x" ? "vertical" : "horizontal"',
    '(mousedown)': 'onMouseDown($event)',
    '(keydown)': 'onKeyDown($event)',
    '[attr.tabindex]': '"0"',
  },
})
export class PrismResizerDirective {
  readonly axis = input.required<'x' | 'y'>();
  readonly min = input(200);
  readonly max = input(600);
  readonly value = input(0);

  /**
   * Pointer travel to value, as a multiplier.
   *
   * `1` (the default) is a panel or sidebar edge. The viewport grips pass `2`
   * and `-2`: their box is centred, so holding one edge changes the width at
   * both. Existing call sites do not pass it and are unaffected.
   */
  readonly scale = input(1);

  readonly valueChange = output<number>();

  private readonly el = inject(ElementRef<HTMLElement>);

  protected onMouseDown(e: MouseEvent): void {
    e.preventDefault();
    const startPos = this.axis() === 'x' ? e.clientX : e.clientY;
    const startVal = this.value();

    this.el.nativeElement.classList.add('active');

    const onMove = (ev: MouseEvent) => {
      const delta =
        this.axis() === 'x' ? ev.clientX - startPos : startPos - ev.clientY;
      this.valueChange.emit(
        resizeValue(startVal, delta, this.scale(), this.min(), this.max())
      );
    };

    const onUp = () => {
      this.el.nativeElement.classList.remove('active');
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  protected onKeyDown(e: KeyboardEvent): void {
    const step = resizeStep(this.scale());
    const current = this.value();
    let next: number | null = null;

    if (this.axis() === 'x') {
      if (e.key === 'ArrowRight') next = current + step;
      if (e.key === 'ArrowLeft') next = current - step;
    } else {
      if (e.key === 'ArrowUp') next = current + step;
      if (e.key === 'ArrowDown') next = current - step;
    }

    if (next !== null) {
      e.preventDefault();
      this.valueChange.emit(Math.max(this.min(), Math.min(this.max(), next)));
    }
  }
}
