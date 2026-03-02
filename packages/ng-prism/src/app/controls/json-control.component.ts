import { Component, input, output } from '@angular/core';

@Component({
  selector: 'prism-json-control',
  standalone: true,
  template: `
    <div class="prism-json-control">
      <label class="prism-json-control__label">{{ label() }}</label>
      <textarea
        class="prism-json-control__input"
        [value]="stringify(value())"
        (input)="onInput($any($event.target).value)"
        rows="4"
      ></textarea>
      @if (parseError) {
        <span class="prism-json-control__error">Invalid JSON</span>
      }
    </div>
  `,
  styles: `
    .prism-json-control {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .prism-json-control__label {
      font-size: 13px;
      color: var(--prism-text-muted);
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .prism-json-control__input {
      background: var(--prism-input-bg);
      border: 1px solid var(--prism-border);
      border-radius: var(--prism-radius-sm);
      color: var(--prism-text);
      font-family: var(--prism-font-mono);
      padding: 5px 8px;
      font-size: 13px;
      width: 100%;
      box-sizing: border-box;
      resize: vertical;
      min-height: 80px;
    }
    .prism-json-control__input:focus {
      outline: none;
      box-shadow: 0 0 0 2px var(--prism-primary);
    }
    .prism-json-control__error {
      font-size: 11px;
      color: #ef4444;
    }
  `,
})
export class JsonControlComponent {
  readonly value = input<unknown>(null);
  readonly label = input('');
  readonly valueChange = output<unknown>();

  parseError = false;

  stringify(val: unknown): string {
    try {
      return JSON.stringify(val, null, 2);
    } catch {
      return String(val);
    }
  }

  onInput(raw: string): void {
    try {
      const parsed = JSON.parse(raw);
      this.parseError = false;
      this.valueChange.emit(parsed);
    } catch {
      this.parseError = true;
    }
  }
}
