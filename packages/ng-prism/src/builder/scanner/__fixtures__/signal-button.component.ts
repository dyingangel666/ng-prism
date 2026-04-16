import { Component, input, output } from '@angular/core';

function Showcase(config: unknown): ClassDecorator {
  return () => {};
}

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

  /** Click event */
  readonly clicked = output<void>();

  /** Value change event */
  readonly valueChange = output<string>();
}
