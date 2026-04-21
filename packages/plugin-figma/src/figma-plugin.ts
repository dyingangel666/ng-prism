import type { NgPrismPlugin } from '@ng-prism/core/plugin';
import { FIGMA_PLUGIN_CONFIG, type FigmaPluginOptions } from './figma-config.token.js';
import { FigmaPanelComponent } from './figma-panel.component.js';

const hasFigmaMeta = (comp: { meta: { showcaseConfig: { meta?: Record<string, unknown> } } }) =>
  typeof comp.meta.showcaseConfig.meta?.['figma'] === 'string';

const hasVariantFigmaMeta = (comp: { meta: { showcaseConfig: { variants?: Array<{ meta?: Record<string, unknown> }> } } }) =>
  comp.meta.showcaseConfig.variants?.some((v) => v.meta?.['figma'] != null) === true;

export function figmaPlugin(options: FigmaPluginOptions = {}): NgPrismPlugin {
  return {
    name: '@ng-prism/plugin-figma',
    panels: [
      {
        id: 'figma',
        label: 'Figma',
        component: FigmaPanelComponent,
        position: 'bottom',
        isVisible: hasFigmaMeta,
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
        isVisible: hasVariantFigmaMeta,
      },
    ],
  };
}
