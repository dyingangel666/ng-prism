import type { NgPrismPlugin } from '@ng-prism/core/plugin';
import { FIGMA_PLUGIN_CONFIG, type FigmaPluginOptions } from './figma-config.token.js';
import { FigmaPanelComponent } from './figma-panel.component.js';

export function figmaPlugin(options: FigmaPluginOptions = {}): NgPrismPlugin {
  return {
    name: '@ng-prism/plugin-figma',
    panels: [
      {
        id: 'figma',
        label: 'Figma',
        component: FigmaPanelComponent,
        position: 'bottom',
      },
      {
        id: 'figma-diff',
        label: 'Design Diff',
        loadComponent: () =>
          import('./diff/figma-design-diff-panel.component.js').then(
            (m) => m.FigmaDesignDiffPanelComponent,
          ),
        position: 'bottom',
        providers: [{ provide: FIGMA_PLUGIN_CONFIG, useValue: options }],
      },
    ],
  };
}
