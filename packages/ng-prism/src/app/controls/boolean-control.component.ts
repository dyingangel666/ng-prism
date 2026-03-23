import { Component, input, output } from '@angular/core';

@Component({
  selector: 'prism-boolean-control',
  standalone: true,
  template: `
    <div class="prism-boolean-control">
      <div class="prism-boolean-control__label">
        <span class="prism-boolean-control__label-text">{{ label() }}</span>
        @if (typeName()) { <code class="prism-boolean-control__type">{{ typeName() }}</code> }
      </div>
      <button
        class="prism-boolean-control__toggle"
        [class.prism-boolean-control__toggle--on]="value()"
        (click)="valueChange.emit(!value())"
        role="switch"
        [attr.aria-checked]="value()"
      >
        <span class="prism-boolean-control__thumb"></span>
      </button>
    </div>
  `,
  styles: `
    .prism-boolean-control {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 16px;
      min-height: 36px;
    }

    .prism-boolean-control__label {
      display: flex;
      flex-direction: column;
      gap: 1px;
    }
    .prism-boolean-control__label-text {
      font-size: 13px;
      font-family: var(--prism-font-sans);
      color: var(--prism-text-muted);
      font-weight: 500;
    }
    .prism-boolean-control__type {
      font-size: 10px;
      font-family: var(--prism-font-mono, monospace);
      color: var(--prism-text-ghost);
    }

    .prism-boolean-control__toggle {
      position: relative;
      width: 36px;
      height: 20px;
      border-radius: 10px;
      border: 1px solid var(--prism-border-strong);
      background: var(--prism-bg-surface);
      cursor: pointer;
      transition: background 0.2s, border-color 0.2s;
      padding: 0;
      flex-shrink: 0;
    }

    .prism-boolean-control__toggle--on {
      background: var(--prism-primary);
      border-color: var(--prism-primary);
    }

    .prism-boolean-control__thumb {
      position: absolute;
      top: 2px;
      left: 2px;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: var(--prism-text-ghost);
      transition: transform 0.2s, background 0.2s;
    }

    .prism-boolean-control__toggle--on .prism-boolean-control__thumb {
      transform: translateX(16px);
      background: var(--prism-bg-elevated);
    }
  `,
})
export class BooleanControlComponent {
  readonly value = input(false);
  readonly label = input('');
  readonly typeName = input('');
  readonly valueChange = output<boolean>();
}
