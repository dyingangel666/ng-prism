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
    templateUrl: './prism-stat.component.html',
    styleUrl: './prism-stat.component.css'
})
export class PrismStatComponent {
    readonly label = input.required<string>();
    readonly value = input.required<string | number>();
    readonly variant = input<MetricVariant>('ok');
}
