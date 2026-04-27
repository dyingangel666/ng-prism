import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';

@Component({
  selector: 'prism-string-control',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <input
      type="text"
      class="ctl-text"
      [value]="value()"
      (input)="valueChange.emit($any($event.target).value)"
    />
  `,
  styles: `
    .ctl-text {
      height: 30px;
      padding: 0 10px;
      background: var(--prism-input-bg);
      border: 1px solid var(--prism-border);
      border-radius: var(--radius-sm);
      color: var(--prism-text);
      font-size: 13px;
      font-family: var(--font-sans);
      flex: 1;
      min-width: 0;
      outline: none;
      transition: border-color var(--dur-fast), box-shadow var(--dur-fast);
    }
    .ctl-text:focus {
      border-color: var(--prism-primary);
      box-shadow: 0 0 0 2px color-mix(in srgb, var(--prism-primary) 30%, transparent);
    }
  `,
})
export class StringControlComponent {
  readonly value = input('');
  readonly label = input('');
  readonly typeName = input('');
  readonly valueChange = output<string>();
}
