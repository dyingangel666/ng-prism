import { Component, input, output } from '@angular/core';

@Component({
  selector: 'prism-number-control',
  standalone: true,
  template: `
    <div class="prism-number-control">
      <label class="prism-number-control__label">{{ label() }}</label>
      <input
        type="number"
        class="prism-number-control__input"
        [value]="value()"
        (input)="valueChange.emit(+$any($event.target).value)"
      />
    </div>
  `,
  styles: `
    .prism-number-control {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .prism-number-control__label {
      font-size: 12px;
      color: var(--prism-text-muted);
    }
    .prism-number-control__input {
      padding: 6px 8px;
      border: 1px solid var(--prism-border);
      border-radius: var(--prism-radius-sm);
      font-size: 13px;
      font-family: var(--prism-font-mono);
      color: var(--prism-text);
      background: var(--prism-bg);
      width: 120px;
    }
    .prism-number-control__input:focus {
      outline: 2px solid var(--prism-primary);
      outline-offset: -1px;
    }
  `,
})
export class NumberControlComponent {
  readonly value = input(0);
  readonly label = input('');
  readonly valueChange = output<number>();
}
