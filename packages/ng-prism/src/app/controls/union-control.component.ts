import { Component, input, output } from '@angular/core';

@Component({
  selector: 'prism-union-control',
  standalone: true,
  template: `
    <fieldset class="prism-union-control">
      <legend class="prism-union-control__label">{{ label() }}</legend>
      @for (option of options(); track option) {
        <label class="prism-union-control__option">
          <input
            type="radio"
            [name]="label()"
            [value]="option"
            [checked]="option === value()"
            (change)="valueChange.emit(option)"
          />
          <span>{{ option }}</span>
        </label>
      }
    </fieldset>
  `,
  styles: `
    .prism-union-control {
      border: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .prism-union-control__label {
      font-size: 13px;
      color: var(--prism-text-muted);
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 0;
      margin-bottom: 2px;
    }
    .prism-union-control__option {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      color: var(--prism-text);
      cursor: pointer;
    }
    .prism-union-control__option input {
      accent-color: var(--prism-primary);
      cursor: pointer;
    }
  `,
})
export class UnionControlComponent {
  readonly value = input('');
  readonly label = input('');
  readonly options = input<string[]>([]);
  readonly valueChange = output<string>();
}
