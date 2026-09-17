import type { NgPrismPlugin, RuntimeComponent } from '@ng-prism/core/plugin';
import type {
  VisualRegressionPluginOptions,
  VrtComponentMeta,
} from './visual-regression.types.js';

function hasResults(component: RuntimeComponent): boolean {
  const meta = component.meta?.showcaseConfig?.meta?.['visualRegression'] as
    | VrtComponentMeta
    | undefined;
  return Boolean(meta?.found && meta.variants.length > 0);
}

/**
 * Browser-safe twin of {@link visualRegressionPlugin}.
 *
 * The config is loaded in Node.js by the builder *and* in the browser by the
 * Prism app. Only the runtime contributions survive here — the build-time hooks
 * read the report from disk and must not be reachable from a browser bundle.
 */
export function visualRegressionPlugin(
  _options?: VisualRegressionPluginOptions
): NgPrismPlugin {
  return {
    name: '@ng-prism/plugin-visual-regression',
    panels: [
      {
        id: 'visual-regression',
        label: 'Visual Regression',
        icon: 'camera',
        position: 'bottom',
        isVisible: hasResults,
        loadComponent: () =>
          import('./visual-regression-panel.component.js').then(
            (m) => m.VisualRegressionPanelComponent
          ),
      },
    ],
    headerWidgets: [
      {
        id: 'visual-regression-total',
        placement: 'end',
        order: -10,
        loadComponent: () =>
          import('./visual-regression-header-badge.component.js').then(
            (m) => m.VisualRegressionHeaderBadgeComponent
          ),
      },
    ],
  };
}
