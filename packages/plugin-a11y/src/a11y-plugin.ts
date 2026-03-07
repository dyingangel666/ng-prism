import type { NgPrismPlugin } from 'ng-prism/plugin';
import type { A11yPluginOptions } from './a11y.types.js';

export function a11yPlugin(options?: A11yPluginOptions): NgPrismPlugin {
  return {
    name: '@ng-prism/plugin-a11y',
    panels: [
      {
        id: 'a11y',
        label: 'Accessibility',
        loadComponent: () =>
          import('./a11y-panel.component.js').then((m) => m.A11yPanelComponent),
        position: 'bottom',
      },
    ],
  };
}
