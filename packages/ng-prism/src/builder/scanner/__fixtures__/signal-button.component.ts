import { Component, input, output } from '@angular/core';

function Showcase(config: unknown): ClassDecorator {
  return () => {};
}

export type ButtonSize = 'small' | 'medium' | 'large';

@Showcase({
  title: 'SignalButton',
  category: 'Inputs',
  variants: [
    { name: 'Primary', inputs: { variant: 'primary', label: 'Click me' } },
  ],
})
@Component({
  selector: 'my-signal-button',
  standalone: true,
  template: `<button>{{ label() }}</button>`,
})
export class SignalButtonComponent {
  /** Visual appearance of the button */
  readonly variant = input<'primary' | 'secondary' | 'danger'>('primary');

  /** Button label text */
  readonly label = input('Button');

  /** Whether the button is disabled */
  readonly disabled = input(false);

  /** Required title */
  readonly title = input.required<string>();

  /** Tab index for keyboard navigation */
  readonly tabIndex = input<number | null>(null);

  /** Optional size with explicit undefined */
  readonly size = input<ButtonSize | undefined>(undefined);

  /** Click event */
  readonly clicked = output<void>();

  /** Value change event */
  readonly valueChange = output<string>();
}
