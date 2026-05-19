import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { OverlayModule } from '@angular/cdk/overlay';
import { Showcase } from '@ng-prism/core';

@Showcase({
  title: 'Checkbox',
  category: 'Components',
  description:
    'CheckboxComponent from test-ui-kit/checkbox secondary entry point.',
  variants: [{ name: 'Default', inputs: { label: 'Checkbox' } }],
})
@Component({
  selector: 'uk-checkbox',
  standalone: true,
  imports: [CommonModule, MatCheckboxModule, OverlayModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="uk">{{ label() }}</div>`,
  styles: `:host { display: inline-block; } .uk { padding: 8px; }`,
})
export class CheckboxComponent {
  readonly label = input<string>('Checkbox');
}
