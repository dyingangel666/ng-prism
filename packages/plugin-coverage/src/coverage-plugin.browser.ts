import type { NgPrismPlugin } from '@ng-prism/core/plugin';
import type { CoveragePluginOptions } from './coverage.types.js';

export function coveragePlugin(_options?: CoveragePluginOptions): NgPrismPlugin {
  return {
    name: '@ng-prism/plugin-coverage',
    panels: [
      {
        id: 'coverage',
        label: 'Coverage',
        icon: 'shield-check',
        loadComponent: () =>
          import('./coverage-panel.component.js').then((m) => m.CoveragePanelComponent),
        position: 'bottom',
      },
    ],
  };
}
