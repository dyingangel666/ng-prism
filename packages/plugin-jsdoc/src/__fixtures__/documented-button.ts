import { Component, input, output } from '@angular/core';

/**
 * Primary action button component.
 * @version 1.0.0
 * @since 1.0.0
 * @deprecated Use PrimaryButtonComponent instead.
 * @see PrimaryButtonComponent
 * @example
 * <doc-button label="Click me" />
 */
@Component({ selector: 'doc-button', standalone: true, template: '' })
export class DocumentedButtonComponent {
  /** Button label text */
  readonly label = input<string>('Click');

  /**
   * Visual variant.
   * @since 1.1.0
   * @deprecated Prefer using semantic tokens
   */
  readonly variant = input<'filled' | 'outlined'>('filled');

  /** Emits when clicked */
  readonly clicked = output<void>();
}

@Component({ selector: 'undocumented-button', standalone: true, template: '' })
export class UndocumentedButtonComponent {
  readonly label = input<string>('');
}
