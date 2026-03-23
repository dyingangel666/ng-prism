import { Component, input, output } from '@angular/core';

@Component({
  selector: 'prism-union-control',
  standalone: true,
  template: `
    <div class="prism-union-control">
      <div class="prism-union-control__label">
        <span class="prism-union-control__label-text">{{ label() }}</span>
        @if (typeName()) { <code class="prism-union-control__type">{{ typeName() }}</code> }
      </div>
      <div class="prism-union-control__options" role="group" [attr.aria-label]="label()">
        @for (option of options(); track option) {
          <button
            class="prism-union-control__option"
            [class.prism-union-control__option--active]="option === value()"
            (click)="valueChange.emit(option)"
          >{{ option }}</button>
        }
      </div>
    </div>
  `,
  styles: `
    .prism-union-control {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 6px 16px;
      min-height: 36px;
    }

    .prism-union-control__label {
      flex-shrink: 0;
      width: 140px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      gap: 1px;
    }
    .prism-union-control__label-text {
      font-size: 13px;
      font-family: var(--prism-font-sans);
      color: var(--prism-text-muted);
      font-weight: 500;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .prism-union-control__type {
      font-size: 10px;
      font-family: var(--prism-font-mono, monospace);
      color: var(--prism-text-ghost);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .prism-union-control__options {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      flex: 1;
    }

    .prism-union-control__option {
      padding: 3px 10px;
      font-size: 12px;
      font-family: var(--prism-font-sans);
      border: 1px solid var(--prism-border);
      border-radius: var(--prism-radius-xs);
      background: var(--prism-input-bg);
      color: var(--prism-text-muted);
      cursor: pointer;
      transition: background 0.1s, color 0.1s, border-color 0.1s;
    }

    .prism-union-control__option:hover {
      color: var(--prism-text-2);
      border-color: var(--prism-border-strong);
    }

    .prism-union-control__option--active {
      background: color-mix(in srgb, var(--prism-primary) 15%, transparent);
      color: var(--prism-primary);
      border-color: color-mix(in srgb, var(--prism-primary) 40%, transparent);
      font-weight: 500;
    }

    .prism-union-control__option--active:hover {
      color: var(--prism-primary);
      border-color: color-mix(in srgb, var(--prism-primary) 40%, transparent);
    }
  `,
})
export class UnionControlComponent {
  readonly value = input('');
  readonly label = input('');
  readonly typeName = input('');
  readonly options = input<string[]>([]);
  readonly valueChange = output<string>();
}
