import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatChipsModule } from '@angular/material/chips';
import { OverlayModule } from '@angular/cdk/overlay';
import { Showcase } from '@ng-prism/core';

@Showcase({
  title: 'Chip',
  category: 'Components',
  description: 'ChipComponent from test-ui-kit/chip secondary entry point.',
  variants: [{ name: 'Default', inputs: { label: 'Chip' } }],
})
@Component({
  selector: 'uk-chip',
  standalone: true,
  imports: [CommonModule, MatChipsModule, OverlayModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="uk">{{ label() }}</div>`,
  styles: `:host { display: inline-block; } .uk { padding: 8px; }`,
})
export class ChipComponent {
  readonly label = input<string>('Chip');
}
