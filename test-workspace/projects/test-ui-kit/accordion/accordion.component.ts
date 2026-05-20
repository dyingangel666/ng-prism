import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatExpansionModule } from '@angular/material/expansion';
import { OverlayModule } from '@angular/cdk/overlay';
import { Showcase } from '@ng-prism/core';

@Showcase({
  title: 'Accordion',
  category: 'Components',
  description:
    'AccordionComponent from test-ui-kit/accordion secondary entry point.',
  variants: [{ name: 'Default', inputs: { label: 'Accordion' } }],
})
@Component({
  selector: 'uk-accordion',
  standalone: true,
  imports: [CommonModule, MatExpansionModule, OverlayModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="uk">{{ label() }}</div>`,
  styles: `:host { display: inline-block; } .uk { padding: 8px; }`,
})
export class AccordionComponent {
  readonly label = input<string>('Accordionn');
}
