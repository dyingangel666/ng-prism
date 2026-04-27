import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';

@Component({
  selector: 'prism-boolean-control',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      class="ctl-toggle"
      [class.on]="value()"
      (click)="valueChange.emit(!value())"
      role="switch"
      [attr.aria-checked]="value()"
    ></button>
  `,
  styles: `
    .ctl-toggle {
      position: relative;
      width: 34px;
      height: 18px;
      border-radius: 9px;
      background: var(--prism-input-bg);
      border: 1px solid var(--prism-border);
      transition: all var(--dur-fast);
      cursor: pointer;
      flex-shrink: 0;
      padding: 0;
    }
    .ctl-toggle::after {
      content: '';
      position: absolute;
      left: 2px;
      top: 2px;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: var(--prism-text-muted);
      transition: transform var(--dur-fast), background var(--dur-fast);
    }
    .ctl-toggle.on {
      background: var(--prism-primary);
      border-color: var(--prism-primary);
    }
    .ctl-toggle.on::after {
      transform: translateX(16px);
      background: white;
    }
  `,
})
export class BooleanControlComponent {
  readonly value = input(false);
  readonly label = input('');
  readonly typeName = input('');
  readonly valueChange = output<boolean>();
}
