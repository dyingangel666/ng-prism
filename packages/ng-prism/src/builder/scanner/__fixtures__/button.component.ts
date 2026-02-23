import { Component, EventEmitter, Input, Output } from '@angular/core';

export interface ShowcaseConfig {
  title: string;
  description?: string;
  category?: string;
  variants?: { name: string; inputs?: Record<string, unknown>; description?: string }[];
  tags?: string[];
}

function Showcase(config: ShowcaseConfig): ClassDecorator {
  return () => {};
}

@Showcase({
  title: 'Button',
  category: 'Inputs',
  description: 'A versatile button component',
  variants: [
    { name: 'Primary', inputs: { variant: 'primary', label: 'Click me' } },
    { name: 'Danger', inputs: { variant: 'danger', disabled: true } },
  ],
  tags: ['form', 'action'],
})
@Component({
  selector: 'my-button',
  standalone: true,
  template: `<button>{{ label }}</button>`,
})
export class ButtonComponent {
  /** Visual appearance of the button */
  @Input() variant: 'primary' | 'secondary' | 'danger' = 'primary';

  /** Button label text */
  @Input() label = 'Button';

  /** Whether the button is disabled */
  @Input() disabled = false;

  /** Size of the button */
  @Input() size: number = 16;

  /** Items list */
  @Input() items: string[] = [];

  /** Click event */
  @Output() clicked = new EventEmitter<void>();

  /** Double click event */
  @Output() doubleClicked = new EventEmitter<MouseEvent>();
}
