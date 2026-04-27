import { Directive, ElementRef, inject, input, output } from '@angular/core';

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
  readonly valueChange = output<number>();

  private readonly el = inject(ElementRef<HTMLElement>);

  protected onMouseDown(e: MouseEvent): void {
    e.preventDefault();
    const startPos = this.axis() === 'x' ? e.clientX : e.clientY;
    const startVal = this.value();
    const invert = this.axis() === 'y';

    this.el.nativeElement.classList.add('active');

    const onMove = (ev: MouseEvent) => {
      const delta = this.axis() === 'x'
        ? ev.clientX - startPos
        : startPos - ev.clientY;
      const next = Math.max(this.min(), Math.min(this.max(), startVal + (invert ? delta : delta)));
      this.valueChange.emit(next);
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
    const step = 10;
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
