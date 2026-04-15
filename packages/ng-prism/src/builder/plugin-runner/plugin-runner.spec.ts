import type { NgPrismPlugin, PrismManifest, ScannedComponent } from '../../plugin/plugin.types.js';
import { runPluginHooks } from './plugin-runner.js';

function createComponent(overrides: Partial<ScannedComponent> = {}): ScannedComponent {
  return {
    className: 'TestComponent',
    filePath: 'test.ts',
    showcaseConfig: { title: 'Test' },
    inputs: [],
    outputs: [],
    componentMeta: { selector: 'test', standalone: true, isDirective: false },
    ...overrides,
  };
}

function createManifest(components: ScannedComponent[] = [createComponent()]): PrismManifest {
  return { components };
}

describe('runPluginHooks', () => {
  it('should return manifest unchanged when no plugins are provided', async () => {
    const manifest = createManifest();
    const result = await runPluginHooks(manifest, []);

    expect(result.components).toEqual(manifest.components);
  });

  it('should call onComponentScanned for each component', async () => {
    const spy = jest.fn();
    const plugin: NgPrismPlugin = { name: 'spy-plugin', onComponentScanned: spy };
    const manifest = createManifest([createComponent(), createComponent({ className: 'OtherComponent' })]);

    await runPluginHooks(manifest, [plugin]);

    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('should apply component transformation when onComponentScanned returns a value', async () => {
    const plugin: NgPrismPlugin = {
      name: 'transform-plugin',
      onComponentScanned: (comp) => ({
        ...comp,
        meta: { ...comp.meta, custom: true },
      }),
    };
    const manifest = createManifest();

    const result = await runPluginHooks(manifest, [plugin]);

    expect(result.components[0].meta).toEqual({ custom: true });
  });

  it('should leave component unchanged when onComponentScanned returns void', async () => {
    const plugin: NgPrismPlugin = {
      name: 'noop-plugin',
      onComponentScanned: () => { /* void */ },
    };
    const manifest = createManifest();

    const result = await runPluginHooks(manifest, [plugin]);

    expect(result.components[0]).toEqual(manifest.components[0]);
  });

  it('should chain multiple plugins sequentially for onComponentScanned', async () => {
    const pluginA: NgPrismPlugin = {
      name: 'plugin-a',
      onComponentScanned: (comp) => ({ ...comp, meta: { ...comp.meta, a: true } }),
    };
    const pluginB: NgPrismPlugin = {
      name: 'plugin-b',
      onComponentScanned: (comp) => ({ ...comp, meta: { ...comp.meta, b: true } }),
    };
    const manifest = createManifest();

    const result = await runPluginHooks(manifest, [pluginA, pluginB]);

    expect(result.components[0].meta).toEqual({ a: true, b: true });
  });

  it('should call onManifestReady and apply transformation', async () => {
    const plugin: NgPrismPlugin = {
      name: 'manifest-plugin',
      onManifestReady: (m) => ({
        components: [...m.components, createComponent({ className: 'InjectedComponent' })],
      }),
    };
    const manifest = createManifest();

    const result = await runPluginHooks(manifest, [plugin]);

    expect(result.components).toHaveLength(2);
    expect(result.components[1].className).toBe('InjectedComponent');
  });

  it('should handle async plugin hooks', async () => {
    const plugin: NgPrismPlugin = {
      name: 'async-plugin',
      onComponentScanned: async (comp) => {
        await new Promise((r) => setTimeout(r, 1));
        return { ...comp, meta: { ...comp.meta, async: true } };
      },
    };
    const manifest = createManifest();

    const result = await runPluginHooks(manifest, [plugin]);

    expect(result.components[0].meta).toEqual({ async: true });
  });
});
