import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { OverlayModule } from '@angular/cdk/overlay';
import { Showcase } from '@ng-prism/core';

@Showcase({
  title: 'Progress',
  category: 'Components',
  description:
    'ProgressComponent from test-ui-kit/progress secondary entry point.',
  variants: [{ name: 'Default', inputs: { label: 'Progress' } }],
})
@Component({
  selector: 'uk-progress',
  standalone: true,
  imports: [CommonModule, MatProgressBarModule, OverlayModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="uk">{{ label() }}</div>`,
  styles: `:host { display: inline-block; } .uk { padding: 8px; }`,
})
export class ProgressComponent {
  readonly label = input<string>('Progress');
}
