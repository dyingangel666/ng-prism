import { Component, input, output } from '@angular/core';

@Component({
  selector: 'prism-string-control',
  standalone: true,
  template: `
    <div class="prism-string-control">
      <label class="prism-string-control__label">{{ label() }}</label>
      <input
        type="text"
        class="prism-string-control__input"
        [value]="value()"
        (input)="valueChange.emit($any($event.target).value)"
      />
    </div>
  `,
  styles: `
    .prism-string-control {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .prism-string-control__label {
      font-size: 12px;
      color: var(--prism-text-muted);
    }
    .prism-string-control__input {
      padding: 6px 8px;
      border: 1px solid var(--prism-border);
      border-radius: var(--prism-radius-sm);
      font-size: 13px;
      font-family: var(--prism-font-family);
      color: var(--prism-text);
      background: var(--prism-bg);
    }
    .prism-string-control__input:focus {
      outline: 2px solid var(--prism-primary);
      outline-offset: -1px;
    }
  `,
})
export class StringControlComponent {
  readonly value = input('');
  readonly label = input('');
  readonly valueChange = output<string>();
}
