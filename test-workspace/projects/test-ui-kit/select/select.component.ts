import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatSelectModule } from '@angular/material/select';
import { OverlayModule } from '@angular/cdk/overlay';
import { Showcase } from '@ng-prism/core';

@Showcase({
  title: 'Select',
  category: 'Components',
  description: 'SelectComponent from test-ui-kit/select secondary entry point.',
  variants: [{ name: 'Default', inputs: { label: 'Select' } }],
})
@Component({
  selector: 'uk-select',
  standalone: true,
  imports: [CommonModule, MatSelectModule, OverlayModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="uk">{{ label() }}</div>`,
  styles: `:host { display: inline-block; } .uk { padding: 8px; }`,
})
export class SelectComponent {
  readonly label = input<string>('Select');
}
