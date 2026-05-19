import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { OverlayModule } from '@angular/cdk/overlay';
import { Showcase } from '@ng-prism/core';

@Showcase({
  title: 'Tabs',
  category: 'Components',
  description: 'TabsComponent from test-ui-kit/tabs secondary entry point.',
  variants: [{ name: 'Default', inputs: { label: 'Tabs' } }],
})
@Component({
  selector: 'uk-tabs',
  standalone: true,
  imports: [CommonModule, MatTabsModule, OverlayModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="uk">{{ label() }}</div>`,
  styles: `:host { display: inline-block; } .uk { padding: 8px; }`,
})
export class TabsComponent {
  readonly label = input<string>('Tabs');
}
