import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
} from '@angular/core';

@Component({
  selector: 'prism-number-control',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ctl-slider">
      <input
        type="range"
        [min]="0"
        [max]="100"
        [value]="value()"
        (input)="valueChange.emit($any($event.target).valueAsNumber || 0)"
      />
      <span class="ctl-slider-val">{{ value() }}</span>
    </div>
  `,
  styles: `
    .ctl-slider {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .ctl-slider input[type=range] {
      flex: 1;
      -webkit-appearance: none;
      height: 4px;
      background: var(--prism-input-bg);
      border-radius: 2px;
      outline: none;
    }
    .ctl-slider input[type=range]::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: linear-gradient(180deg, var(--prism-primary-from), var(--prism-primary-to));
      cursor: pointer;
      border: 2px solid var(--prism-bg-elevated);
    }
    .ctl-slider-val {
      font-family: var(--font-mono);
      font-size: 12px;
      color: var(--prism-text);
      min-width: 44px;
      text-align: right;
    }
  `,
})
export class NumberControlComponent {
  readonly value = input(0);
  readonly label = input('');
  readonly typeName = input('');
  readonly valueChange = output<number>();
}
