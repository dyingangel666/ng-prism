import { Component, input, output } from '@angular/core';

@Component({
  selector: 'prism-boolean-control',
  standalone: true,
  template: `
    <label class="prism-boolean-control">
      <input
        type="checkbox"
        [checked]="value()"
        (change)="valueChange.emit($any($event.target).checked)"
      />
      <span class="prism-boolean-control__label">{{ label() }}</span>
    </label>
  `,
  styles: `
    .prism-boolean-control {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
    }
    .prism-boolean-control input {
      accent-color: var(--prism-primary);
    }
    .prism-boolean-control__label {
      font-size: 13px;
      color: var(--prism-text);
    }
  `,
})
export class BooleanControlComponent {
  readonly value = input(false);
  readonly label = input('');
  readonly valueChange = output<boolean>();
}
