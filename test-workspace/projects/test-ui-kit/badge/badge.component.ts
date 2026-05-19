import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatBadgeModule } from '@angular/material/badge';
import { OverlayModule } from '@angular/cdk/overlay';
import { Showcase } from '@ng-prism/core';

@Showcase({
  title: 'Badge',
  category: 'Components',
  description: 'BadgeComponent from test-ui-kit/badge secondary entry point.',
  variants: [{ name: 'Default', inputs: { label: 'Badge' } }],
})
@Component({
  selector: 'uk-badge',
  standalone: true,
  imports: [CommonModule, MatBadgeModule, OverlayModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="uk">{{ label() }}</div>`,
  styles: `:host { display: inline-block; } .uk { padding: 8px; }`,
})
export class BadgeComponent {
  readonly label = input<string>('Badge');
}
