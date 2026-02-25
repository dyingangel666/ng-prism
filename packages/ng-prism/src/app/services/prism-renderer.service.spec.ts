import { Injector, runInInjectionContext } from '@angular/core';
import type { RuntimeComponent, RuntimeManifest } from '../../plugin/plugin.types.js';
import { PRISM_MANIFEST } from '../tokens/prism-tokens.js';
import { PrismManifestService } from './prism-manifest.service.js';
import { PrismNavigationService } from './prism-navigation.service.js';
import { PrismRendererService } from './prism-renderer.service.js';
import { PrismSearchService } from './prism-search.service.js';

function createComponent(
  overrides: Partial<{
    inputs: RuntimeComponent['meta']['inputs'];
    variants: RuntimeComponent['meta']['showcaseConfig']['variants'];
  }> = {},
): RuntimeComponent {
  return {
    type: class {} as any,
    meta: {
      className: 'Comp',
      filePath: '/test.ts',
      showcaseConfig: {
        title: 'Test',
        variants: overrides.variants,
      },
      inputs: overrides.inputs ?? [],
      outputs: [],
      componentMeta: { selector: 'test', standalone: true },
    },
  };
}

function setup(manifest: RuntimeManifest) {
  const baseInjector = Injector.create({
    providers: [{ provide: PRISM_MANIFEST, useValue: manifest }],
  });
  const manifestService = runInInjectionContext(baseInjector, () => new PrismManifestService());
  const searchService = runInInjectionContext(
    Injector.create({
      providers: [{ provide: PrismManifestService, useValue: manifestService }],
      parent: baseInjector,
    }),
    () => new PrismSearchService(),
  );
  const navigation = runInInjectionContext(
    Injector.create({
      providers: [{ provide: PrismSearchService, useValue: searchService }],
      parent: baseInjector,
    }),
    () => new PrismNavigationService(),
  );
  const renderer = runInInjectionContext(
    Injector.create({
      providers: [{ provide: PrismNavigationService, useValue: navigation }],
      parent: baseInjector,
    }),
    () => new PrismRendererService(),
  );
  return { renderer, navigation };
}

describe('PrismRendererService', () => {
  it('should have empty inputValues initially', () => {
    const { renderer } = setup({ components: [] });
    expect(renderer.inputValues()).toEqual({});
  });

  it('should update single input via updateInput()', () => {
    const { renderer } = setup({ components: [] });
    renderer.updateInput('label', 'World');
    expect(renderer.inputValues()).toEqual({ label: 'World' });
  });

  it('should merge inputs via updateInput()', () => {
    const { renderer } = setup({ components: [] });
    renderer.updateInput('a', 1);
    renderer.updateInput('b', 2);
    expect(renderer.inputValues()).toEqual({ a: 1, b: 2 });
  });

  it('should reset for component and apply defaults', () => {
    const comp = createComponent({
      inputs: [
        { name: 'label', type: 'string', defaultValue: 'Hello', required: false },
        { name: 'count', type: 'number', defaultValue: 42, required: false },
      ],
    });
    const { renderer, navigation } = setup({ components: [comp] });

    navigation.select(comp);
    renderer.resetForComponent(comp);

    expect(renderer.activeVariantIndex()).toBe(0);
    expect(renderer.inputValues()).toEqual({ label: 'Hello', count: 42 });
  });

  it('should apply variant inputs merged with defaults', () => {
    const comp = createComponent({
      inputs: [
        { name: 'label', type: 'string', defaultValue: 'Default', required: false },
        { name: 'disabled', type: 'boolean', defaultValue: false, required: false },
      ],
      variants: [
        { name: 'Default' },
        { name: 'Disabled', inputs: { disabled: true } },
      ],
    });
    const { renderer, navigation } = setup({ components: [comp] });

    navigation.select(comp);
    renderer.selectVariant(1);

    expect(renderer.activeVariantIndex()).toBe(1);
    expect(renderer.inputValues()).toEqual({ label: 'Default', disabled: true });
  });

  it('should skip inputs without defaultValue', () => {
    const comp = createComponent({
      inputs: [
        { name: 'label', type: 'string', required: true },
        { name: 'count', type: 'number', defaultValue: 0, required: false },
      ],
    });
    const { renderer, navigation } = setup({ components: [comp] });

    navigation.select(comp);
    renderer.selectVariant(0);

    expect(renderer.inputValues()).toEqual({ count: 0 });
  });

  it('should reset variant-managed inputs when switching back', () => {
    const comp = createComponent({
      inputs: [
        { name: 'label', type: 'string', defaultValue: 'Default', required: false },
        { name: 'disabled', type: 'boolean', defaultValue: false, required: false },
      ],
      variants: [
        { name: 'Default' },
        { name: 'Disabled', inputs: { disabled: true } },
      ],
    });
    const { renderer, navigation } = setup({ components: [comp] });
    navigation.select(comp);

    renderer.selectVariant(1);
    expect(renderer.inputValues()).toEqual({ label: 'Default', disabled: true });

    renderer.selectVariant(0);
    expect(renderer.inputValues()).toEqual({ label: 'Default', disabled: false });
  });

  it('should reset variant-managed inputs even without scanned defaultValue', () => {
    const comp = createComponent({
      inputs: [],
      variants: [
        { name: 'Default', inputs: { variant: 'filled' } },
        { name: 'Disabled', inputs: { variant: 'filled', disabled: true } },
      ],
    });
    const { renderer, navigation } = setup({ components: [comp] });
    navigation.select(comp);

    renderer.selectVariant(1);
    expect(renderer.inputValues()).toMatchObject({ disabled: true });

    renderer.selectVariant(0);
    expect(renderer.inputValues()['disabled']).toBeUndefined();
  });

  it('should not reset required inputs', () => {
    const comp = createComponent({
      inputs: [{ name: 'title', type: 'string', required: true }],
      variants: [
        { name: 'Default' },
        { name: 'WithTitle', inputs: { title: 'Hello' } },
      ],
    });
    const { renderer, navigation } = setup({ components: [comp] });
    navigation.select(comp);

    renderer.selectVariant(1);
    expect(renderer.inputValues()).toEqual({ title: 'Hello' });

    renderer.selectVariant(0);
    expect(renderer.inputValues()).toEqual({});
  });

  it('should reset variant index on resetForComponent', () => {
    const comp1 = createComponent({
      inputs: [{ name: 'a', type: 'string', defaultValue: 'x', required: false }],
      variants: [{ name: 'V1' }, { name: 'V2' }],
    });
    const comp2 = createComponent({
      inputs: [{ name: 'b', type: 'number', defaultValue: 0, required: false }],
    });
    const { renderer, navigation } = setup({ components: [comp1, comp2] });

    navigation.select(comp1);
    renderer.selectVariant(1);
    expect(renderer.activeVariantIndex()).toBe(1);

    navigation.select(comp2);
    renderer.resetForComponent(comp2);

    expect(renderer.activeVariantIndex()).toBe(0);
    expect(renderer.inputValues()).toEqual({ b: 0 });
  });
});
