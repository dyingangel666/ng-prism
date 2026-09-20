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
  template: `
    <span
      class="metric-badge"
      role="img"
      [class.metric-badge--warn]="variant() === 'warn'"
      [class.metric-badge--danger]="variant() === 'danger'"
      [attr.title]="title() || label()"
      [attr.aria-label]="accessibleName()"
    >
      <prism-icon [name]="icon()" [size]="12" aria-hidden="true" />
      <span class="metric-badge__value">{{ value() }}</span>
    </span>
  `,
  styles: `
    :host { display: inline-flex; align-items: center; }

    .metric-badge {
      display: inline-flex;
      align-items: center;
      gap: var(--sp-2);
      height: 20px;
      padding: 0 var(--sp-3) 0 var(--sp-2);
      border-radius: var(--radius-sm);
      border: 1px solid var(--prism-border);
      background: var(--prism-input-bg);
      color: var(--prism-text-muted);
      font-family: var(--font-mono);
      font-size: var(--fs-xs);
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }
    .metric-badge__value { color: var(--prism-text); font-weight: 600; }

    .metric-badge--warn {
      color: var(--prism-mark-attention);
      border-color: color-mix(in srgb, var(--prism-mark-attention) 35%, transparent);
      background: color-mix(in srgb, var(--prism-mark-attention) 10%, transparent);
    }
    .metric-badge--warn .metric-badge__value { color: var(--prism-mark-attention); }

    .metric-badge--danger {
      color: var(--prism-mark-critical);
      border-color: color-mix(in srgb, var(--prism-mark-critical) 40%, transparent);
      background: color-mix(in srgb, var(--prism-mark-critical) 10%, transparent);
    }
    .metric-badge--danger .metric-badge__value { color: var(--prism-mark-critical); }
  `,
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
