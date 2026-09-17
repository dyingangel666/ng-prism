import type { NgPrismPlugin, RuntimeComponent } from '@ng-prism/core/plugin';
import type {
  VisualRegressionPluginOptions,
  VrtComponentMeta,
  VrtThresholds,
} from './visual-regression.types.js';

const DEFAULT_REPORT_PATH = 'vrt-report.json';

/**
 * Any regression is worth seeing, so the badge only stays green at a perfect
 * score. It degrades to warn, then danger, as the score falls.
 */
export const DEFAULT_VRT_THRESHOLDS: VrtThresholds = { score: 100 };

export function resolveVrtThresholds(
  input?: number | Partial<VrtThresholds>
): VrtThresholds {
  if (input === undefined) return { ...DEFAULT_VRT_THRESHOLDS };
  if (typeof input === 'number') return { score: input };
  return { ...DEFAULT_VRT_THRESHOLDS, ...input };
}

/** True when the plugin recorded at least one result for this component. */
function hasResults(component: RuntimeComponent): boolean {
  const meta = component.meta?.showcaseConfig?.meta?.['visualRegression'] as
    | VrtComponentMeta
    | undefined;
  return Boolean(meta?.found && meta.variants.length > 0);
}

/**
 * Renders a visual regression report produced by an external runner.
 *
 * The plugin performs no image comparison of its own — that belongs to the
 * runner, which owns the baselines and the pinned container. See
 * `docs/guide/visual-regression.md`.
 */
export function visualRegressionPlugin(
  options?: VisualRegressionPluginOptions
): NgPrismPlugin {
  const reportPath = options?.reportPath ?? DEFAULT_REPORT_PATH;
  const assetBaseUrl = options?.assetBaseUrl ?? '';
  const thresholds = resolveVrtThresholds(options?.thresholds);

  return {
    name: '@ng-prism/plugin-visual-regression',

    async onComponentScanned(component) {
      const { readVariantsForComponent } = await import('./report-reader.js');
      const variants = readVariantsForComponent(
        reportPath,
        component.className
      );

      const meta: VrtComponentMeta = {
        found: variants.length > 0,
        variants,
        assetBaseUrl,
      };

      return {
        ...component,
        showcaseConfig: {
          ...component.showcaseConfig,
          meta: { ...component.showcaseConfig.meta, visualRegression: meta },
        },
      };
    },

    async onManifestReady(manifest) {
      const { readTotals } = await import('./report-reader.js');
      const total = readTotals(reportPath);

      return {
        ...manifest,
        meta: {
          ...manifest.meta,
          visualRegression: { found: total !== null, total, thresholds },
        },
      };
    },

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
