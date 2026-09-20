import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { MetricVariant } from './head-metrics.js';

/**
 * One line of the gauge's readout: caption left, value right.
 *
 * Was a right-aligned tile in the old head. The pill it used to carry is gone
 * rather than restyled — it duplicated the caption directly beneath it.
 */
@Component({
  selector: 'prism-stat',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="stat"
      [class.stat--warn]="variant() === 'warn'"
      [class.stat--danger]="variant() === 'danger'"
    >
      <span class="stat__dot" aria-hidden="true"></span>
      <span class="stat__lbl">{{ label() }}</span>
      <span class="stat__val">{{ value() }}</span>
    </div>
  `,
  styles: `
    .stat {
      display: flex;
      align-items: center;
      gap: var(--sp-3);
      padding: var(--sp-2) var(--sp-3);
      border-radius: var(--radius-xs);
      font-size: var(--fs-md);
      color: var(--prism-text-2);
    }
    .stat__dot {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: transparent;
      flex: none;
    }
    .stat__lbl { white-space: nowrap; }
    .stat__val {
      margin-left: auto;
      font-family: var(--font-mono);
      font-variant-numeric: tabular-nums;
      color: var(--prism-text);
    }
    .stat--warn .stat__dot { background: var(--prism-mark-attention); }
    .stat--warn .stat__val { color: var(--prism-mark-attention); }
    .stat--danger .stat__dot { background: var(--prism-mark-critical); }
    .stat--danger .stat__val { color: var(--prism-mark-critical); }
  `,
})
export class PrismStatComponent {
  readonly label = input.required<string>();
  readonly value = input.required<string | number>();
  readonly variant = input<MetricVariant>('ok');
}
