import { Directive, ElementRef, inject, input, OnDestroy, Renderer2 } from '@angular/core';
import { Showcase } from '@ng-prism/core';

export type TooltipDirectivePositionType = 'top' | 'bottom' | 'left' | 'right';

@Showcase({
  title: 'Tooltip Directive',
  category: 'Directives / Overlay',
  description: 'Attribute directive that adds a hover tooltip to any host element.',
  host: {
    selector: 'lib-button',
    import: { name: 'ButtonComponent', from: 'test-lib' },
    inputs: { label: 'Hover me', variant: 'filled' },
  },
  variants: [
    { name: 'Top', inputs: { libTooltip: 'Helpful hint', tooltipPosition: 'top' } },
    { name: 'Bottom', inputs: { libTooltip: 'More info below', tooltipPosition: 'bottom' } },
    { name: 'Left', inputs: { libTooltip: 'Side note', tooltipPosition: 'left' } },
    { name: 'Right', inputs: { libTooltip: 'Extra context', tooltipPosition: 'right' } },
    {
      name: 'Long Text',
      inputs: {
        libTooltip: 'This is a longer tooltip message that wraps to multiple lines for detailed explanations.',
        tooltipPosition: 'top',
      },
    },
  ],
  tags: ['overlay', 'tooltip', 'directive', 'attribute'],
})
@Directive({
  selector: '[libTooltip]',
  standalone: true,
  host: {
    '(mouseenter)': 'show()',
    '(mouseleave)': 'hide()',
    '(focus)': 'show()',
    '(blur)': 'hide()',
  },
})
export class TooltipDirective implements OnDestroy {
  readonly libTooltip = input.required<string>();
  readonly tooltipPosition = input<TooltipDirectivePositionType>('top');

  private readonly el = inject(ElementRef);
  private readonly renderer = inject(Renderer2);
  private tooltipElement: HTMLElement | null = null;

  show(): void {
    if (this.tooltipElement) return;

    const host = this.el.nativeElement as HTMLElement;
    host.style.position = 'relative';

    this.tooltipElement = this.renderer.createElement('div') as HTMLElement;
    this.tooltipElement.textContent = this.libTooltip();
    this.tooltipElement.setAttribute('role', 'tooltip');

    Object.assign(this.tooltipElement.style, {
      position: 'absolute',
      zIndex: '10',
      padding: '6px 10px',
      background: '#1f2937',
      color: '#fff',
      fontSize: '12px',
      lineHeight: '1.4',
      borderRadius: '6px',
      whiteSpace: 'normal',
      maxWidth: '220px',
      pointerEvents: 'none',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      ...this.getPositionStyles(),
    });

    this.renderer.appendChild(host, this.tooltipElement);
  }

  hide(): void {
    if (this.tooltipElement) {
      this.renderer.removeChild(this.el.nativeElement, this.tooltipElement);
      this.tooltipElement = null;
    }
  }

  ngOnDestroy(): void {
    this.hide();
  }

  private getPositionStyles(): Record<string, string> {
    switch (this.tooltipPosition()) {
      case 'bottom':
        return { top: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)' };
      case 'left':
        return { right: 'calc(100% + 8px)', top: '50%', transform: 'translateY(-50%)' };
      case 'right':
        return { left: 'calc(100% + 8px)', top: '50%', transform: 'translateY(-50%)' };
      case 'top':
      default:
        return { bottom: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)' };
    }
  }
}
