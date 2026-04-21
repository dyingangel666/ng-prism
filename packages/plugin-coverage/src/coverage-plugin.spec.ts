import path from 'node:path';
import { coveragePlugin } from './coverage-plugin.js';
import { clearCoverageCache } from './coverage-reader.js';
import type { ScannedComponent } from '@ng-prism/core/plugin';

const FIXTURE_PATH = path.join(__dirname, '__fixtures__/coverage-summary.json');

function makeComponent(overrides?: Partial<ScannedComponent>): ScannedComponent {
  return {
    className: 'ButtonComponent',
    filePath: '/workspace/src/app/button/button.component.ts',
    showcaseConfig: { title: 'Button' },
    inputs: [],
    outputs: [],
    componentMeta: { selector: 'app-button', standalone: true, isDirective: false },
    ...overrides,
  };
}

describe('coveragePlugin', () => {
  afterEach(() => {
    clearCoverageCache();
  });

  it('should return a plugin with the correct name', () => {
    const plugin = coveragePlugin();
    expect(plugin.name).toBe('@ng-prism/plugin-coverage');
  });

  it('should register a single panel', () => {
    const plugin = coveragePlugin();
    expect(plugin.panels).toHaveLength(1);
  });

  it('should define the Coverage panel with correct properties', () => {
    const plugin = coveragePlugin();
    const panel = plugin.panels![0];
    expect(panel.id).toBe('coverage');
    expect(panel.label).toBe('Coverage');
    expect(panel.position).toBe('bottom');
    expect(panel.loadComponent).toBeDefined();
    expect(panel.component).toBeUndefined();
  });

  it('should lazy-load the panel component', async () => {
    const plugin = coveragePlugin();
    const panel = plugin.panels![0];
    const Component = await panel.loadComponent!();
    expect(Component).toBeDefined();
    expect(Component.name).toBe('CoveragePanelComponent');
  });

  it('should define onComponentScanned hook', () => {
    const plugin = coveragePlugin();
    expect(plugin.onComponentScanned).toBeDefined();
  });

  describe('onComponentScanned', () => {
    it('should inject coverage data into showcaseConfig.meta', async () => {
      const plugin = coveragePlugin({ coveragePath: FIXTURE_PATH });
      const component = makeComponent();
      const result = await plugin.onComponentScanned!(component);

      expect(result).toBeDefined();
      const meta = (result as ScannedComponent).showcaseConfig.meta;
      expect(meta?.['coverage']).toBeDefined();
      const coverage = meta?.['coverage'] as any;
      expect(coverage.found).toBe(true);
      expect(coverage.score).toBe(Math.round((80 + 75 + 100 + 90) / 4));
    });

    it('should preserve existing showcaseConfig.meta properties', async () => {
      const plugin = coveragePlugin({ coveragePath: FIXTURE_PATH });
      const component = makeComponent({
        showcaseConfig: { title: 'Button', meta: { figma: 'https://figma.com/foo' } },
      });
      const result = await plugin.onComponentScanned!(component);

      const meta = (result as ScannedComponent).showcaseConfig.meta;
      expect(meta?.['figma']).toBe('https://figma.com/foo');
      expect(meta?.['coverage']).toBeDefined();
    });

    it('should inject found:false when no coverage data exists for file', async () => {
      const plugin = coveragePlugin({ coveragePath: FIXTURE_PATH });
      const component = makeComponent({
        filePath: '/workspace/src/app/unknown/unknown.component.ts',
      });
      const result = await plugin.onComponentScanned!(component);

      const coverage = (result as ScannedComponent).showcaseConfig.meta?.['coverage'] as any;
      expect(coverage.found).toBe(false);
      expect(coverage.score).toBe(0);
    });

    it('should inject found:false when coverage file does not exist', async () => {
      const plugin = coveragePlugin({ coveragePath: '/nonexistent/coverage-summary.json' });
      const component = makeComponent();
      const result = await plugin.onComponentScanned!(component);

      const coverage = (result as ScannedComponent).showcaseConfig.meta?.['coverage'] as any;
      expect(coverage.found).toBe(false);
    });
  });
});
