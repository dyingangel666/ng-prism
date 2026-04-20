import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from '@angular/core';
import { Showcase } from '@ng-prism/core';

export type SpinnerSizeType = 'sm' | 'md' | 'lg';

/**
 * An animated loading spinner with configurable size and color.
 * @since 1.0.0
 */
@Showcase({
  title: 'Spinner',
  category: 'Components / Feedback',
  description: 'Animated circular spinner for loading states in various sizes.',
  variants: [
    { name: 'Small', inputs: { size: 'sm' } },
    { name: 'Medium', inputs: { size: 'md' } },
    { name: 'Large', inputs: { size: 'lg' } },
    { name: 'With Label', inputs: { size: 'md', label: 'Loading...' } },
    { name: 'Custom Color', inputs: { size: 'md', color: '#ef4444' } },
  ],
  tags: ['feedback', 'spinner', 'loading', 'indicator'],
})
@Component({
  selector: 'sg-spinner',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'sg-spinner',
    '[attr.data-size]': 'size()',
    '[attr.role]': '"status"',
  },
  template: `
    <svg class="sg-spinner__svg" viewBox="0 0 24 24" fill="none" [style.color]="color()">
      <circle class="sg-spinner__track" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" opacity="0.2"/>
      <path class="sg-spinner__arc" d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
    </svg>
    @if (label()) {
      <span class="sg-spinner__label">{{ label() }}</span>
    }
  `,
  styles: `
    .sg-spinner { display: inline-flex; align-items: center; gap: 8px; }
    .sg-spinner__svg { animation: sg-spin 0.8s linear infinite; }
    .sg-spinner[data-size="sm"] .sg-spinner__svg { width: 16px; height: 16px; }
    .sg-spinner[data-size="md"] .sg-spinner__svg { width: 24px; height: 24px; }
    .sg-spinner[data-size="lg"] .sg-spinner__svg { width: 36px; height: 36px; }
    .sg-spinner__label { font-size: 13px; color: #6b7280; }
    @keyframes sg-spin { to { transform: rotate(360deg); } }
  `,
})
export class SpinnerComponent {
  readonly size = input<SpinnerSizeType>('md');
  readonly label = input<string>('');
  readonly color = input<string>('#6366f1');
}
