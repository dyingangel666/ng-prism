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
      font-size: 13px;
      color: var(--prism-text-muted);
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .prism-string-control__input {
      background: var(--prism-input-bg);
      border: 1px solid var(--prism-border);
      border-radius: var(--prism-radius-sm);
      color: var(--prism-text);
      font-family: var(--prism-font-family);
      padding: 5px 8px;
      font-size: 13px;
      width: 100%;
      box-sizing: border-box;
    }
    .prism-string-control__input:focus {
      outline: none;
      box-shadow: 0 0 0 2px var(--prism-primary);
    }
  `,
})
export class StringControlComponent {
  readonly value = input('');
  readonly label = input('');
  readonly valueChange = output<string>();
}
