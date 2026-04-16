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

function setup(manifest: RuntimeManifest): { service: PrismNavigationService; manifestService: PrismManifestService } {
  const rootInjector = Injector.create({
    providers: [{ provide: PRISM_MANIFEST, useValue: manifest }],
  });
  const manifestService = runInInjectionContext(rootInjector, () => new PrismManifestService());
  const searchService = runInInjectionContext(
    Injector.create({
      providers: [{ provide: PrismManifestService, useValue: manifestService }],
      parent: rootInjector,
    }),
    () => new PrismSearchService(),
  );
  const navInjector = Injector.create({
    providers: [
      { provide: PrismManifestService, useValue: manifestService },
      { provide: PrismSearchService, useValue: searchService },
    ],
    parent: rootInjector,
  });
  const service = runInInjectionContext(navInjector, () => new PrismNavigationService());
  return { service, manifestService };
}

describe('PrismNavigationService', () => {
  it('should have null activeComponent by default', () => {
    const { service } = setup({ components: [] });
    expect(service.activeComponent()).toBeNull();
  });

  it('should set activeComponent via select()', () => {
    const comp = createComponent({ title: 'Button' });
    const { service } = setup({ components: [comp] });
    service.select(comp);
    expect(service.activeComponent()).toBe(comp);
  });

  it('should select first component via selectFirst()', () => {
    const first = createComponent({ title: 'Alpha', className: 'Alpha' });
    const second = createComponent({ title: 'Beta', className: 'Beta' });
    const { service } = setup({ components: [first, second] });
    service.selectFirst();
    expect(service.activeComponent()).toBe(first);
  });

  it('should set null when selectFirst() called on empty manifest', () => {
    const { service } = setup({ components: [] });
    service.selectFirst();
    expect(service.activeComponent()).toBeNull();
  });

  it('should build categoryTree from filtered components', () => {
    const a = createComponent({ category: 'Forms', className: 'A' });
    const b = createComponent({ category: 'Forms', className: 'B' });
    const c = createComponent({ category: 'Layout', className: 'C' });
    const { service } = setup({ components: [a, b, c] });

    const tree = service.categoryTree();
    expect(tree.get('Forms')).toEqual([
      { kind: 'component', data: a },
      { kind: 'component', data: b },
    ]);
    expect(tree.get('Layout')).toEqual([
      { kind: 'component', data: c },
    ]);
  });

  it('should re-link activeComponent to new reference when manifest updates with same className', () => {
    const original = createComponent({ title: 'Button', className: 'Btn' });
    const { service, manifestService } = setup({ components: [original] });
    service.select(original);

    const updated = createComponent({ title: 'Button NEW', className: 'Btn' });
    manifestService.updateManifest({ components: [updated] });

    expect(service.activeComponent()).toBe(updated);
    expect(service.activeComponent()).not.toBe(original);
  });

  it('should return null for activeComponent when active component is removed from manifest', () => {
    const removed = createComponent({ className: 'Removed' });
    const survivor = createComponent({ className: 'Survivor' });
    const { service, manifestService } = setup({ components: [removed, survivor] });
    service.select(removed);

    manifestService.updateManifest({ components: [survivor] });

    expect(service.activeComponent()).toBeNull();
  });

  it('should set activeItem to null when active component is removed and manifest is empty', () => {
    const comp = createComponent({ className: 'Only' });
    const { service, manifestService } = setup({ components: [comp] });
    service.select(comp);

    manifestService.updateManifest({ components: [] });

    expect(service.activeComponent()).toBeNull();
  });

  it('should re-link activePage by title when manifest updates', () => {
    const page = { type: 'component' as const, title: 'Intro', category: 'Docs', component: class {} as any };
    const { service, manifestService } = setup({ components: [], pages: [page] });
    service.selectPage(page);

    const updatedPage = { type: 'component' as const, title: 'Intro', category: 'Docs', component: class {} as any };
    manifestService.updateManifest({ components: [], pages: [updatedPage] });

    expect(service.activePage()).toBe(updatedPage);
    expect(service.activePage()).not.toBe(page);
  });
});
