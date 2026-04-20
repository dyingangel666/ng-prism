import { ChangeDetectionStrategy, Component, input, model, output, ViewEncapsulation } from '@angular/core';
import { Showcase } from '@ng-prism/core';

export type AlertSeverityType = 'info' | 'success' | 'warning' | 'error';

/**
 * An inline alert banner for contextual messages with optional dismiss action.
 * @since 1.0.0
 */
@Showcase({
  title: 'Alert',
  category: 'Components / Feedback',
  description: 'Contextual alert banner with severity variants and optional dismiss button.',
  variants: [
    { name: 'Info', inputs: { severity: 'info', message: 'A new version is available.' } },
    { name: 'Success', inputs: { severity: 'success', message: 'Changes saved successfully.' } },
    { name: 'Warning', inputs: { severity: 'warning', message: 'Your session expires in 5 minutes.' } },
    { name: 'Error', inputs: { severity: 'error', message: 'Failed to load data. Please retry.' } },
    { name: 'Dismissible', inputs: { severity: 'info', message: 'Click X to dismiss.', dismissible: true } },
    { name: 'With Title', inputs: { severity: 'warning', title: 'Attention', message: 'Please review your changes.' } },
  ],
  tags: ['feedback', 'alert', 'notification', 'message'],
})
@Component({
  selector: 'sg-alert',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'sg-alert',
    '[attr.data-severity]': 'severity()',
    '[attr.role]': '"alert"',
  },
  template: `
    @if (visible()) {
      <div class="sg-alert__body">
        <div class="sg-alert__content">
          @if (title()) {
            <strong class="sg-alert__title">{{ title() }}</strong>
          }
          <span class="sg-alert__message">{{ message() }}</span>
        </div>
        @if (dismissible()) {
          <button class="sg-alert__close" aria-label="Dismiss" (click)="dismiss()">
            <svg viewBox="0 0 16 16" width="16" height="16">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" fill="none"/>
            </svg>
          </button>
        }
      </div>
    }
  `,
  styles: `
    .sg-alert { display: block; }
    .sg-alert__body {
      display: flex; align-items: flex-start; gap: 8px;
      padding: 10px 14px; border-radius: 8px; border-left: 4px solid;
      font-size: 13px; line-height: 1.5;
    }
    .sg-alert[data-severity="info"] .sg-alert__body { background: #eff6ff; border-color: #3b82f6; color: #1e40af; }
    .sg-alert[data-severity="success"] .sg-alert__body { background: #f0fdf4; border-color: #22c55e; color: #166534; }
    .sg-alert[data-severity="warning"] .sg-alert__body { background: #fffbeb; border-color: #f59e0b; color: #92400e; }
    .sg-alert[data-severity="error"] .sg-alert__body { background: #fef2f2; border-color: #ef4444; color: #991b1b; }
    .sg-alert__content { flex: 1; display: flex; flex-direction: column; gap: 2px; }
    .sg-alert__title { font-weight: 600; }
    .sg-alert__close {
      flex-shrink: 0; display: flex; align-items: center; justify-content: center;
      width: 24px; height: 24px; border: none; background: transparent;
      color: inherit; opacity: 0.6; cursor: pointer; border-radius: 4px; padding: 0;
    }
    .sg-alert__close:hover { opacity: 1; background: rgba(0,0,0,0.06); }
  `,
})
export class AlertComponent {
  readonly severity = input<AlertSeverityType>('info');
  readonly message = input.required<string>();
  readonly title = input<string>('');
  readonly dismissible = input<boolean>(false);
  readonly visible = model<boolean>(true);
  readonly dismissed = output<void>();

  /** Hides the alert and emits the dismissed event. */
  dismiss(): void {
    this.visible.set(false);
    this.dismissed.emit();
  }

  /** Resets the alert to its visible state. */
  show(): void {
    this.visible.set(true);
  }
}
