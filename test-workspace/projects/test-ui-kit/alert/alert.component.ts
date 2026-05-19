import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { OverlayModule } from '@angular/cdk/overlay';
import { Showcase } from '@ng-prism/core';

@Showcase({
  title: 'Alert',
  category: 'Components',
  description: 'AlertComponent from test-ui-kit/alert secondary entry point.',
  variants: [{ name: 'Default', inputs: { label: 'Alert' } }],
})
@Component({
  selector: 'uk-alert',
  standalone: true,
  imports: [CommonModule, MatSnackBarModule, OverlayModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="uk">{{ label() }}</div>`,
  styles: `:host { display: inline-block; } .uk { padding: 8px; }`,
})
export class AlertComponent {
  readonly label = input<string>('Alert');
}
