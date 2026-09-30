import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { summarizeMetrics, type HeadMetric } from './head-metrics.js';
import { PrismStatComponent } from './prism-stat.component.js';

/**
 * Measurement disclosure for the component head.
 *
 * Replaces four always-present stat tiles with one element of fixed width at a
 * fixed position, so the row does not shift when you switch components. It
 * shows a plain count in the nominal green while everything is within
 * threshold, and the worst value in plain text when it is not. The full
 * readout is one click away and never disappears.
 *
 * It knows no individual metric. The list arrives already resolved, in the
 * same shape `decorateItem` produces for the sidebar, which is less code than
 * the five @if branches it replaces and keeps the colour rule in one place.
 */
@Component({
  selector: 'prism-head-gauge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrismStatComponent],
  templateUrl: './prism-head-gauge.component.html',
  styleUrl: './prism-head-gauge.component.css',
})
export class PrismHeadGaugeComponent {
  readonly metrics = input.required<readonly HeadMetric[]>();
  protected readonly summary = computed(() => summarizeMetrics(this.metrics()));
  protected readonly ariaLabel = computed(() => {
    const s = this.summary();
    return s.worst === null
      ? `${s.measured} metrics, all within threshold`
      : `${s.worst.label} ${s.worst.value}${
          s.others > 0 ? `, ${s.others} more deviating` : ''
        }`;
  });
}
