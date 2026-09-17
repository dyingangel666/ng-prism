import { join } from 'node:path';
import type { ScannedComponent, PrismManifest } from '@ng-prism/core/plugin';
import { visualRegressionPlugin } from './visual-regression-plugin.js';
import { DEFAULT_VRT_THRESHOLDS, resolveVrtThresholds } from './thresholds.js';
import { clearReportCache } from './report-reader.js';
import type {
  VrtComponentMeta,
  VrtManifestMeta,
} from './visual-regression.types.js';

const FIXTURE = join(__dirname, '__fixtures__', 'vrt-report.json');
const MISSING = join(__dirname, '__fixtures__', 'does-not-exist.json');

function scanned(className: string): ScannedComponent {
  return {
    className,
    filePath: `/src/${className}.ts`,
    showcaseConfig: { title: className },
    inputs: [],
    outputs: [],
    componentMeta: { selector: 'x', standalone: true, isDirective: false },
  };
}

function manifest(): PrismManifest {
  return { components: [], pages: [] };
}

describe('resolveVrtThresholds', () => {
  it('defaults when nothing is given', () => {
    expect(resolveVrtThresholds()).toEqual(DEFAULT_VRT_THRESHOLDS);
  });

  it('accepts a bare number as the score threshold', () => {
    expect(resolveVrtThresholds(90)).toEqual({ score: 90 });
  });

  it('merges a partial object over the defaults', () => {
    expect(resolveVrtThresholds({ score: 80 })).toEqual({ score: 80 });
  });
});

describe('visualRegressionPlugin', () => {
  beforeEach(() => clearReportCache());

  it('is named after its package', () => {
    expect(visualRegressionPlugin().name).toBe(
      '@ng-prism/plugin-visual-regression'
    );
  });

  describe('onComponentScanned', () => {
    it('attaches the component variants to showcaseConfig.meta', async () => {
      const plugin = visualRegressionPlugin({ reportPath: FIXTURE });
      const result = (await plugin.onComponentScanned!(
        scanned('DividerComponent')
      )) as ScannedComponent;

      const meta = result.showcaseConfig.meta![
        'visualRegression'
      ] as VrtComponentMeta;
      expect(meta.found).toBe(true);
      expect(meta.variants).toHaveLength(2);
    });

    it('carries the configured asset base url through to the runtime', async () => {
      const plugin = visualRegressionPlugin({
        reportPath: FIXTURE,
        assetBaseUrl: 'assets/vrt/',
      });
      const result = (await plugin.onComponentScanned!(
        scanned('DividerComponent')
      )) as ScannedComponent;

      const meta = result.showcaseConfig.meta![
        'visualRegression'
      ] as VrtComponentMeta;
      expect(meta.assetBaseUrl).toBe('assets/vrt/');
    });

    it('marks a component with no results as not found', async () => {
      const plugin = visualRegressionPlugin({ reportPath: FIXTURE });
      const result = (await plugin.onComponentScanned!(
        scanned('UnknownComponent')
      )) as ScannedComponent;

      const meta = result.showcaseConfig.meta![
        'visualRegression'
      ] as VrtComponentMeta;
      expect(meta.found).toBe(false);
      expect(meta.variants).toEqual([]);
    });

    it('preserves existing meta from other plugins', async () => {
      const plugin = visualRegressionPlugin({ reportPath: FIXTURE });
      const input = scanned('DividerComponent');
      input.showcaseConfig.meta = { jsdoc: { description: 'keep me' } };

      const result = (await plugin.onComponentScanned!(
        input
      )) as ScannedComponent;

      expect(result.showcaseConfig.meta!['jsdoc']).toEqual({
        description: 'keep me',
      });
    });
  });

  describe('onManifestReady', () => {
    it('attaches the totals and thresholds to manifest.meta', async () => {
      const plugin = visualRegressionPlugin({ reportPath: FIXTURE });
      const result = (await plugin.onManifestReady!(
        manifest()
      )) as PrismManifest;

      const meta = result.meta!['visualRegression'] as VrtManifestMeta;
      expect(meta.found).toBe(true);
      expect(meta.total!.score).toBe(75);
      expect(meta.thresholds).toEqual(DEFAULT_VRT_THRESHOLDS);
    });

    it('reports not found when the report is missing', async () => {
      const plugin = visualRegressionPlugin({ reportPath: MISSING });
      const result = (await plugin.onManifestReady!(
        manifest()
      )) as PrismManifest;

      const meta = result.meta!['visualRegression'] as VrtManifestMeta;
      expect(meta.found).toBe(false);
      expect(meta.total).toBeNull();
    });
  });

  describe('panel', () => {
    it('registers one lazy bottom panel', () => {
      const panel = visualRegressionPlugin().panels![0];
      expect(panel.id).toBe('visual-regression');
      expect(panel.position).toBe('bottom');
      expect(panel.loadComponent).toBeDefined();
      expect(panel.component).toBeUndefined();
    });

    it('is visible for a component that has results', () => {
      const panel = visualRegressionPlugin().panels![0];
      const comp = {
        meta: {
          showcaseConfig: {
            meta: { visualRegression: { found: true, variants: [{}] } },
          },
        },
      } as never;
      expect(panel.isVisible!(comp)).toBe(true);
    });

    it('is hidden for a component with no results', () => {
      const panel = visualRegressionPlugin().panels![0];
      const comp = {
        meta: {
          showcaseConfig: {
            meta: { visualRegression: { found: false, variants: [] } },
          },
        },
      } as never;
      expect(panel.isVisible!(comp)).toBe(false);
    });

    it('is hidden for a component the plugin never annotated', () => {
      const panel = visualRegressionPlugin().panels![0];
      const comp = { meta: { showcaseConfig: {} } } as never;
      expect(panel.isVisible!(comp)).toBe(false);
    });
  });

  describe('header widget', () => {
    it('registers one lazy badge at the end of the header', () => {
      const widget = visualRegressionPlugin().headerWidgets![0];
      expect(widget.id).toBe('visual-regression-total');
      expect(widget.placement).toBe('end');
      expect(widget.order).toBe(-10);
      expect(widget.loadComponent).toBeDefined();
    });
  });
});
