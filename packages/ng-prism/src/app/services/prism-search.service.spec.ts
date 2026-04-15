import { Injector, runInInjectionContext } from '@angular/core';
import type { RuntimeComponent, RuntimeManifest } from '../../plugin/plugin.types.js';
import { PRISM_MANIFEST } from '../tokens/prism-tokens.js';
import { PrismManifestService } from './prism-manifest.service.js';
import { PrismSearchService } from './prism-search.service.js';

function createComponent(
  overrides: Partial<{ title: string; category: string; tags: string[] }> = {},
): RuntimeComponent {
  return {
    type: class {} as any,
    meta: {
      className: 'Comp',
      filePath: '/test.ts',
      showcaseConfig: {
        title: overrides.title ?? 'Default',
        category: overrides.category,
        tags: overrides.tags,
      },
      inputs: [],
      outputs: [],
      componentMeta: { selector: 'test', standalone: true, isDirective: false },
    },
  };
}

function setup(manifest: RuntimeManifest): PrismSearchService {
  const injector = Injector.create({
    providers: [{ provide: PRISM_MANIFEST, useValue: manifest }],
  });
  const manifestService = runInInjectionContext(injector, () => new PrismManifestService());
  const childInjector = Injector.create({
    providers: [{ provide: PrismManifestService, useValue: manifestService }],
    parent: injector,
  });
  return runInInjectionContext(childInjector, () => new PrismSearchService());
}

describe('PrismSearchService', () => {
  it('should return all components when query is empty', () => {
    const comps = [createComponent({ title: 'Button' }), createComponent({ title: 'Card' })];
    const service = setup({ components: comps });
    expect(service.filteredComponents()).toEqual(comps);
  });

  it('should filter by title', () => {
    const btn = createComponent({ title: 'Button' });
    const card = createComponent({ title: 'Card' });
    const service = setup({ components: [btn, card] });

    service.search('button');
    expect(service.filteredComponents()).toEqual([btn]);
  });

  it('should filter case-insensitively', () => {
    const btn = createComponent({ title: 'Button' });
    const service = setup({ components: [btn] });

    service.search('BUTTON');
    expect(service.filteredComponents()).toEqual([btn]);
  });

  it('should filter by category', () => {
    const btn = createComponent({ title: 'Button', category: 'Forms' });
    const card = createComponent({ title: 'Card', category: 'Layout' });
    const service = setup({ components: [btn, card] });

    service.search('forms');
    expect(service.filteredComponents()).toEqual([btn]);
  });

  it('should filter by tags', () => {
    const btn = createComponent({ title: 'Button', tags: ['input', 'action'] });
    const card = createComponent({ title: 'Card', tags: ['container'] });
    const service = setup({ components: [btn, card] });

    service.search('action');
    expect(service.filteredComponents()).toEqual([btn]);
  });

  it('should clear the query', () => {
    const comps = [createComponent({ title: 'Button' }), createComponent({ title: 'Card' })];
    const service = setup({ components: comps });

    service.search('button');
    expect(service.filteredComponents().length).toBe(1);

    service.clear();
    expect(service.filteredComponents()).toEqual(comps);
  });

  it('should handle empty results', () => {
    const service = setup({ components: [createComponent({ title: 'Button' })] });
    service.search('nonexistent');
    expect(service.filteredComponents()).toEqual([]);
  });
});
