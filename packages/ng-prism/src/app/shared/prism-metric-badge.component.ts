import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { PrismIconComponent } from '../icons/prism-icon.component.js';

/**
 * Library-wide metric badge for the header.
 *
 * Presentational only — it takes an already-formatted value and a variant and
 * knows nothing about thresholds, manifests or where the number came from.
 * That keeps the three badges that use it (a11y in core, coverage and visual
 * regression in their plugins) owning their own data logic while sharing one
 * appearance.
 *
 * It carries an icon rather than a text label on purpose. The glyph is the
 * same one the source contributes to the navigation marks and its panel tab,
 * so one symbol means one source wherever it appears — and the badge gets
 * narrow enough that three of them fit a 40px header without crowding it.
 * The icon is `aria-hidden` — it is decoration, not content. The accessible
 * name is composed here as "label: value" (e.g. "Library coverage: 23%"), so
 * the figure that is the whole point of the badge cannot be dropped by a
 * consumer that only passes `label`. `title` stays the full text the
 * consumer passes, for the hover tooltip.
 */
@Component({
  selector: 'prism-metric-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrismIconComponent],
  templateUrl: './prism-metric-badge.component.html',
  styleUrl: './prism-metric-badge.component.css',
})
export class PrismMetricBadgeComponent {
  readonly icon = input.required<string>();
  readonly value = input.required<string>();
  readonly label = input.required<string>();
  readonly title = input<string>('');
  readonly variant = input<'ok' | 'warn' | 'danger'>('ok');

  /** "label: value" — the accessible name, so the figure is never dropped. */
  readonly accessibleName = computed(() => `${this.label()}: ${this.value()}`);
}
