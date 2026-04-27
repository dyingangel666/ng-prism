import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
} from '@angular/core';

@Component({
  selector: 'prism-union-control',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ctl-pills" role="group">
      @for (option of options(); track option) {
      <button
        class="ctl-pill"
        [class.ctl-pill--active]="option === value()"
        (click)="valueChange.emit(option)"
      >
        {{ option }}
      </button>
      }
    </div>
  `,
  styles: `
    .ctl-pills {
      display: flex;
      gap: 4px;
      flex-wrap: wrap;
    }
    .ctl-pill {
      height: 26px;
      padding: 0 10px;
      font-size: var(--fs-sm);
      font-weight: 500;
      border: 1px solid var(--prism-border);
      border-radius: 4px;
      color: var(--prism-text-muted);
      background: transparent;
      cursor: pointer;
      transition: all var(--dur-fast);
      font-family: var(--font-sans);
    }
    .ctl-pill:hover {
      color: var(--prism-text);
      border-color: var(--prism-border-strong);
    }
    .ctl-pill--active {
      background: color-mix(in srgb, var(--prism-primary) 15%, transparent);
      color: var(--prism-primary);
      border-color: color-mix(in srgb, var(--prism-primary) 40%, transparent);
      font-weight: 600;
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
