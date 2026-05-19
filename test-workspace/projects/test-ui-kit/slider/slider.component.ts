import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatSliderModule } from '@angular/material/slider';
import { OverlayModule } from '@angular/cdk/overlay';
import { Showcase } from '@ng-prism/core';

@Showcase({
  title: 'Slider',
  category: 'Components',
  description: 'SliderComponent from test-ui-kit/slider secondary entry point.',
  variants: [{ name: 'Default', inputs: { label: 'Slider' } }],
})
@Component({
  selector: 'uk-slider',
  standalone: true,
  imports: [CommonModule, MatSliderModule, OverlayModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="uk">{{ label() }}</div>`,
  styles: `:host { display: inline-block; } .uk { padding: 8px; }`,
})
export class SliderComponent {
  readonly label = input<string>('Slider');
}
