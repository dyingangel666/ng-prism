import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTooltipModule } from '@angular/material/tooltip';
import { OverlayModule } from '@angular/cdk/overlay';
import { Showcase } from '@ng-prism/core';

@Showcase({
  title: 'Tooltip',
  status: 'wip',
  category: 'Components',
  description:
    'TooltipComponent from test-ui-kit/tooltip secondary entry point.',
  variants: [{ name: 'Default', inputs: { label: 'Tooltip' } }],
})
@Component({
  selector: 'uk-tooltip',
  standalone: true,
  imports: [CommonModule, MatTooltipModule, OverlayModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="uk">{{ label() }}</div>`,
  styles: `:host { display: inline-block; } .uk { padding: 8px; }`,
})
export class TooltipComponent {
  readonly label = input<string>('Tooltip');
}
