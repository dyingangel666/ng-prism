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
 * fixed position, so the row does not shift when you switch components. Quiet
 * and grey while everything is within threshold — a gauge you do not have to
 * read is one that is in order — and the worst value in plain text when it is
 * not. The full readout is one click away and never disappears.
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
  template: `
    <button
      class="gauge"
      type="button"
      [class.gauge--warn]="summary().variant === 'warn'"
      [class.gauge--danger]="summary().variant === 'danger'"
      popovertarget="prism-head-gauge"
      [attr.aria-label]="ariaLabel()"
      [attr.title]="ariaLabel()"
    >
      <span class="gauge__dot" aria-hidden="true"></span>
      @if (summary().worst; as worst) {
      <span class="gauge__text">{{ worst.label }} {{ worst.value }}</span>
      @if (summary().others > 0) {
      <span class="gauge__more">+{{ summary().others }}</span>
      } } @else {
      <span class="gauge__text">{{ summary().measured }}</span>
      }
    </button>

    <div popover id="prism-head-gauge" class="gauge-card">
      @for (m of metrics(); track m.id) {
      <prism-stat [label]="m.label" [value]="m.value" [variant]="m.variant" />
      }
    </div>
  `,
  styles: `
    :host { display: inline-flex; }

    .gauge {
      display: inline-flex;
      align-items: center;
      gap: var(--sp-2);
      height: 20px;
      padding: 0 var(--sp-3);
      border: 1px solid var(--prism-border);
      border-radius: var(--radius-xs);
      background: transparent;
      color: var(--prism-text-muted);
      font-family: var(--font-mono);
      font-size: var(--fs-xs);
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
      cursor: pointer;
      anchor-name: --prism-head-gauge;
    }
    .gauge:focus-visible {
      outline: 2px solid var(--prism-primary);
      outline-offset: 1px;
    }
    .gauge__dot {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: currentColor;
      opacity: 0.5;
    }
    .gauge__more { opacity: 0.6; }

    .gauge--warn {
      color: var(--prism-mark-attention);
      border-color: color-mix(in srgb, var(--prism-mark-attention) 40%, transparent);
    }
    .gauge--danger {
      color: var(--prism-mark-critical);
      border-color: color-mix(in srgb, var(--prism-mark-critical) 45%, transparent);
    }
    .gauge--warn .gauge__dot,
    .gauge--danger .gauge__dot { opacity: 1; }

    .gauge-card {
      margin: 0;
      padding: var(--sp-2);
      min-width: 200px;
      border: 1px solid var(--prism-border-strong);
      border-radius: var(--radius-md);
      background: var(--prism-bg-elevated);
      box-shadow: 0 8px 28px -10px rgba(0, 0, 0, 0.45);
      display: flex;
      flex-direction: column;
      gap: 1px;
      position-anchor: --prism-head-gauge;
      position-area: block-end span-inline-start;
      position-try-fallbacks: flip-block, flip-inline;
      inset: auto;
    }
  `,
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
