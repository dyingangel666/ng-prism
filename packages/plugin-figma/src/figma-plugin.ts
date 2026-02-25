import type { NgPrismPlugin } from 'ng-prism/plugin';
import { FigmaPanelComponent } from './figma-panel.component.js';

export function figmaPlugin(): NgPrismPlugin {
  return {
    name: '@ng-prism/plugin-figma',
    panels: [
      {
        id: 'figma',
        label: 'Figma',
        component: FigmaPanelComponent,
        position: 'bottom',
      },
    ],
  };
}
