import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { PrismIconComponent } from '../icons/prism-icon.component.js';

/**
 * Library-wide metric badge for the header.
 *
 * Presentational only: it takes a formatted value and a variant, so each badge
 * (a11y in core, coverage and visual regression in their plugins) keeps its own
 * data logic while sharing one appearance.
 *
 * It shows an icon instead of a text label: the same glyph the source uses for
 * its navigation marks and panel tab, and narrow enough to fit three badges in
 * the 40px header. The icon is `aria-hidden`; the accessible name is built here
 * as "label: value" (e.g. "Library coverage: 23%") so a consumer cannot drop
 * the figure. `title` is the consumer's full text for the hover tooltip.
 */
@Component({
    selector: 'prism-metric-badge',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [PrismIconComponent],
    templateUrl: './prism-metric-badge.component.html',
    styleUrl: './prism-metric-badge.component.css'
})
export class PrismMetricBadgeComponent {
    readonly icon = input.required<string>();
    readonly value = input.required<string>();
    readonly label = input.required<string>();
    readonly title = input<string>('');
    readonly variant = input<'ok' | 'warn' | 'danger'>('ok');

    /** "label: value" is the accessible name, so the figure is never dropped. */
    readonly accessibleName = computed(() => `${this.label()}: ${this.value()}`);
}
