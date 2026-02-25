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
      font-size: 12px;
      color: var(--prism-text-muted);
    }
    .prism-json-control__input {
      padding: 6px 8px;
      border: 1px solid var(--prism-border);
      border-radius: var(--prism-radius-sm);
      font-size: 12px;
      font-family: var(--prism-font-mono);
      color: var(--prism-text);
      background: var(--prism-bg);
      resize: vertical;
    }
    .prism-json-control__input:focus {
      outline: 2px solid var(--prism-primary);
      outline-offset: -1px;
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
