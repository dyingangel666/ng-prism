import type { NgPrismPlugin } from 'ng-prism/plugin';
import type { PerfPluginOptions } from './perf.types.js';

export function perfPlugin(_options?: PerfPluginOptions): NgPrismPlugin {
  return {
    name: '@ng-prism/plugin-perf',
    panels: [
      {
        id: 'perf',
        label: 'Performance',
        loadComponent: () =>
          import('./perf-panel.component.js').then((m) => m.PerfPanelComponent),
        position: 'bottom',
      },
    ],
  };
}
