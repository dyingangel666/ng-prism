import type { NgPrismPlugin } from '@ng-prism/core/plugin';
import { readCoverageForFile } from './coverage-reader.js';
import type { CoveragePluginOptions } from './coverage.types.js';

const DEFAULT_COVERAGE_PATH = 'coverage/coverage-summary.json';

export function coveragePlugin(options?: CoveragePluginOptions): NgPrismPlugin {
  const coveragePath = options?.coveragePath ?? DEFAULT_COVERAGE_PATH;

  return {
    name: '@ng-prism/plugin-coverage',
    async onComponentScanned(component) {
      const coverage = readCoverageForFile(coveragePath, component.filePath);
      return {
        ...component,
        showcaseConfig: {
          ...component.showcaseConfig,
          meta: { ...component.showcaseConfig.meta, coverage },
        },
      };
    },
    panels: [
      {
        id: 'coverage',
        label: 'Coverage',
        loadComponent: () =>
          import('./coverage-panel.component.js').then((m) => m.CoveragePanelComponent),
        position: 'bottom',
      },
    ],
  };
}
