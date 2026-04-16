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
    isDirective: boolean;
    host: RuntimeComponent['meta']['showcaseConfig']['host'];
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
        ...(overrides.host !== undefined && { host: overrides.host }),
      },
      inputs: overrides.inputs ?? [],
      outputs: [],
      componentMeta: { selector: 'test', standalone: true, isDirective: overrides.isDirective ?? false },
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
      providers: [
        { provide: PrismSearchService, useValue: searchService },
        { provide: PrismManifestService, useValue: manifestService },
      ],
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

  describe('reconcileForComponent', () => {
    it('should behave like resetForComponent on first call', () => {
      const comp = createComponent({
        inputs: [{ name: 'label', type: 'string', defaultValue: 'Hello', required: false }],
      });
      const { renderer, navigation } = setup({ components: [comp] });
      navigation.select(comp);

      renderer.reconcileForComponent(comp);

      expect(renderer.activeVariantIndex()).toBe(0);
      expect(renderer.inputValues()).toEqual({ label: 'Hello' });
    });

    it('should preserve variant index when className is unchanged', () => {
      const comp = createComponent({
        inputs: [{ name: 'label', type: 'string', defaultValue: 'Hi', required: false }],
        variants: [{ name: 'V1' }, { name: 'V2' }, { name: 'V3' }],
      });
      const { renderer, navigation } = setup({ components: [comp] });
      navigation.select(comp);
      renderer.resetForComponent(comp);
      renderer.selectVariant(2);

      const compRefreshed = createComponent({
        inputs: [{ name: 'label', type: 'string', defaultValue: 'Hi', required: false }],
        variants: [{ name: 'V1' }, { name: 'V2' }, { name: 'V3' }],
      });
      renderer.reconcileForComponent(compRefreshed);

      expect(renderer.activeVariantIndex()).toBe(2);
    });

    it('should clamp variant index when variants list shrinks', () => {
      const comp = createComponent({
        inputs: [],
        variants: [{ name: 'V1' }, { name: 'V2' }, { name: 'V3' }],
      });
      const { renderer, navigation } = setup({ components: [comp] });
      navigation.select(comp);
      renderer.resetForComponent(comp);
      renderer.selectVariant(2);

      const compShrunk = createComponent({
        inputs: [],
        variants: [{ name: 'V1' }],
      });
      renderer.reconcileForComponent(compShrunk);

      expect(renderer.activeVariantIndex()).toBe(0);
    });

    it('should preserve input values for inputs that still exist', () => {
      const comp = createComponent({
        inputs: [
          { name: 'label', type: 'string', defaultValue: 'Default', required: false },
          { name: 'count', type: 'number', defaultValue: 0, required: false },
        ],
      });
      const { renderer, navigation } = setup({ components: [comp] });
      navigation.select(comp);
      renderer.resetForComponent(comp);
      renderer.updateInput('label', 'User Value');
      renderer.updateInput('count', 42);

      renderer.reconcileForComponent(comp);

      expect(renderer.inputValues()['label']).toBe('User Value');
      expect(renderer.inputValues()['count']).toBe(42);
    });

    it('should discard values for inputs that no longer exist', () => {
      const comp = createComponent({
        inputs: [
          { name: 'label', type: 'string', required: false },
          { name: 'obsolete', type: 'string', required: false },
        ],
      });
      const { renderer, navigation } = setup({ components: [comp] });
      navigation.select(comp);
      renderer.resetForComponent(comp);
      renderer.updateInput('label', 'Keep');
      renderer.updateInput('obsolete', 'Drop');

      const compReduced = createComponent({
        inputs: [{ name: 'label', type: 'string', required: false }],
      });
      renderer.reconcileForComponent(compReduced);

      expect(renderer.inputValues()['label']).toBe('Keep');
      expect(renderer.inputValues()['obsolete']).toBeUndefined();
    });

    it('should merge variant defaults for newly added inputs', () => {
      const comp = createComponent({
        inputs: [{ name: 'label', type: 'string', required: false }],
        variants: [{ name: 'V1', inputs: { label: 'Orig' } }],
      });
      const { renderer, navigation } = setup({ components: [comp] });
      navigation.select(comp);
      renderer.resetForComponent(comp);

      const compExpanded = createComponent({
        inputs: [
          { name: 'label', type: 'string', required: false },
          { name: 'variant', type: 'string', required: false },
        ],
        variants: [{ name: 'V1', inputs: { label: 'Orig', variant: 'primary' } }],
      });
      renderer.reconcileForComponent(compExpanded);

      expect(renderer.inputValues()['label']).toBe('Orig');
      expect(renderer.inputValues()['variant']).toBe('primary');
    });

    it('should full-reset when className changes', () => {
      const first = createComponent({
        inputs: [{ name: 'label', type: 'string', defaultValue: 'A', required: false }],
      });
      first.meta.className = 'First';

      const { renderer, navigation } = setup({ components: [first] });
      navigation.select(first);
      renderer.resetForComponent(first);
      renderer.updateInput('label', 'Custom');

      const second = createComponent({
        inputs: [{ name: 'title', type: 'string', defaultValue: 'B', required: false }],
      });
      second.meta.className = 'Second';

      renderer.reconcileForComponent(second);

      expect(renderer.inputValues()['label']).toBeUndefined();
      expect(renderer.inputValues()['title']).toBe('B');
    });

    it('should preserve __prismContent__ on same-className reconcile', () => {
      const comp = createComponent({
        isDirective: true,
        host: '<button>',
        inputs: [{ name: 'tooltip', type: 'string', required: false }],
        variants: [{ name: 'V1', content: 'Hover me' }],
      });
      const { renderer, navigation } = setup({ components: [comp] });
      navigation.select(comp);
      renderer.resetForComponent(comp);
      expect(renderer.inputValues()['__prismContent__']).toBe('Hover me');

      renderer.reconcileForComponent(comp);

      expect(renderer.inputValues()['__prismContent__']).toBe('Hover me');
    });
  });

  describe('directive support', () => {
    it('should set __prismContent__ in inputValues for directive with string content', () => {
      const comp = createComponent({
        isDirective: true,
        host: '<button>',
        inputs: [{ name: 'color', type: 'string', defaultValue: 'red', required: false }],
        variants: [
          { name: 'Default', inputs: { color: 'red' }, content: 'Hover me' },
        ],
      });
      const { renderer, navigation } = setup({ components: [comp] });

      navigation.select(comp);
      renderer.resetForComponent(comp);

      expect(renderer.inputValues()['__prismContent__']).toBe('Hover me');
      expect(renderer.inputValues()['color']).toBe('red');
    });

    it('should set activeContent to undefined for directive variants', () => {
      const comp = createComponent({
        isDirective: true,
        host: '<span>',
        variants: [
          { name: 'Default', content: 'Text' },
        ],
      });
      const { renderer, navigation } = setup({ components: [comp] });

      navigation.select(comp);
      renderer.resetForComponent(comp);

      expect(renderer.activeContent()).toBeUndefined();
    });

    it('should not inject __prismContent__ when directive variant has no content', () => {
      const comp = createComponent({
        isDirective: true,
        host: '<div>',
        inputs: [{ name: 'size', type: 'number', defaultValue: 16, required: false }],
        variants: [
          { name: 'Default', inputs: { size: 24 } },
        ],
      });
      const { renderer, navigation } = setup({ components: [comp] });

      navigation.select(comp);
      renderer.resetForComponent(comp);

      expect(renderer.inputValues()['__prismContent__']).toBeUndefined();
      expect(renderer.inputValues()['size']).toBe(24);
    });

    it('should set activeContent normally for non-directive components', () => {
      const comp = createComponent({
        isDirective: false,
        variants: [
          { name: 'Default', content: 'Projected content' },
        ],
      });
      const { renderer, navigation } = setup({ components: [comp] });

      navigation.select(comp);
      renderer.resetForComponent(comp);

      expect(renderer.activeContent()).toBe('Projected content');
      expect(renderer.inputValues()['__prismContent__']).toBeUndefined();
    });
  });
});
