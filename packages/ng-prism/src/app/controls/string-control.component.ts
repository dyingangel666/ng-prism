import { Component, input, output } from '@angular/core';

@Component({
  selector: 'prism-string-control',
  standalone: true,
  template: `
    <div class="prism-string-control">
      <span class="prism-string-control__label">{{ label() }}</span>
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
      align-items: center;
      gap: 12px;
      padding: 6px 16px;
      min-height: 36px;
    }

    .prism-string-control__label {
      font-size: 13px;
      font-family: var(--prism-font-sans);
      color: var(--prism-text-muted);
      font-weight: 500;
      flex-shrink: 0;
      width: 140px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .prism-string-control__input {
      flex: 1;
      background: var(--prism-input-bg);
      border: 1px solid var(--prism-border);
      border-radius: var(--prism-radius-sm);
      color: var(--prism-text);
      font-family: var(--prism-font-sans);
      padding: 4px 8px;
      font-size: 13px;
      min-width: 0;
      box-sizing: border-box;
      transition: border-color 0.15s;
    }

    .prism-string-control__input:focus {
      outline: none;
      border-color: var(--prism-primary);
      box-shadow: 0 0 0 2px var(--prism-glow);
    }
  `,
})
export class StringControlComponent {
  readonly value = input('');
  readonly label = input('');
  readonly valueChange = output<string>();
}
