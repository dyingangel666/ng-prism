import type { NgPrismPlugin } from 'ng-prism/plugin';
import { scanBundle } from './bundle/bundle-scanner.js';
import type { PerfPluginOptions } from './perf.types.js';

export function perfPlugin(options?: PerfPluginOptions): NgPrismPlugin {
  return {
    name: '@ng-prism/plugin-perf',

    async onComponentScanned(component) {
      const bundle = scanBundle(
        component.filePath,
        options?.bundle?.maxTreeDepth ?? 5,
      );
      return {
        ...component,
        showcaseConfig: {
          ...component.showcaseConfig,
          meta: {
            ...component.showcaseConfig.meta,
            perf: { bundle },
          },
        },
      };
    },

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
