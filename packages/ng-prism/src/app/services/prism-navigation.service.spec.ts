import { Injector, runInInjectionContext } from '@angular/core';
import type { RuntimeComponent, RuntimeManifest } from '../../plugin/plugin.types.js';
import { PRISM_MANIFEST } from '../tokens/prism-tokens.js';
import { PrismManifestService } from './prism-manifest.service.js';
import { PrismNavigationService } from './prism-navigation.service.js';
import { PrismSearchService } from './prism-search.service.js';

function createComponent(
  overrides: Partial<{ title: string; category: string; className: string }> = {},
): RuntimeComponent {
  return {
    type: class {} as any,
    meta: {
      className: overrides.className ?? 'Comp',
      filePath: '/test.ts',
      showcaseConfig: {
        title: overrides.title ?? 'Default',
        category: overrides.category,
      },
      inputs: [],
      outputs: [],
      componentMeta: { selector: 'test', standalone: true, isDirective: false },
    },
  };
}

function setup(manifest: RuntimeManifest): PrismNavigationService {
  const injector = Injector.create({
    providers: [{ provide: PRISM_MANIFEST, useValue: manifest }],
  });
  const manifestService = runInInjectionContext(injector, () => new PrismManifestService());
  const searchService = runInInjectionContext(
    Injector.create({
      providers: [{ provide: PrismManifestService, useValue: manifestService }],
      parent: injector,
    }),
    () => new PrismSearchService(),
  );
  const navInjector = Injector.create({
    providers: [
      { provide: PrismSearchService, useValue: searchService },
    ],
    parent: injector,
  });
  return runInInjectionContext(navInjector, () => new PrismNavigationService());
}

describe('PrismNavigationService', () => {
  it('should have null activeComponent by default', () => {
    const service = setup({ components: [] });
    expect(service.activeComponent()).toBeNull();
  });

  it('should set activeComponent via select()', () => {
    const comp = createComponent({ title: 'Button' });
    const service = setup({ components: [comp] });
    service.select(comp);
    expect(service.activeComponent()).toBe(comp);
  });

  it('should select first component via selectFirst()', () => {
    const first = createComponent({ title: 'Alpha', className: 'Alpha' });
    const second = createComponent({ title: 'Beta', className: 'Beta' });
    const service = setup({ components: [first, second] });
    service.selectFirst();
    expect(service.activeComponent()).toBe(first);
  });

  it('should set null when selectFirst() called on empty manifest', () => {
    const service = setup({ components: [] });
    service.selectFirst();
    expect(service.activeComponent()).toBeNull();
  });

  it('should build categoryTree from filtered components', () => {
    const a = createComponent({ category: 'Forms', className: 'A' });
    const b = createComponent({ category: 'Forms', className: 'B' });
    const c = createComponent({ category: 'Layout', className: 'C' });
    const service = setup({ components: [a, b, c] });

    const tree = service.categoryTree();
    expect(tree.get('Forms')).toEqual([
      { kind: 'component', data: a },
      { kind: 'component', data: b },
    ]);
    expect(tree.get('Layout')).toEqual([
      { kind: 'component', data: c },
    ]);
  });
});
