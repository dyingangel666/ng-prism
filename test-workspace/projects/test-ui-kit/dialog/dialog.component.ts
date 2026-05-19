import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule } from '@angular/material/dialog';
import { OverlayModule } from '@angular/cdk/overlay';
import { Showcase } from '@ng-prism/core';

@Showcase({
  title: 'Dialog',
  category: 'Components',
  description: 'DialogComponent from test-ui-kit/dialog secondary entry point.',
  variants: [{ name: 'Default', inputs: { label: 'Dialog' } }],
})
@Component({
  selector: 'uk-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, OverlayModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="uk">{{ label() }}</div>`,
  styles: `:host { display: inline-block; } .uk { padding: 8px; }`,
})
export class DialogComponent {
  readonly label = input<string>('Dialog');
}
