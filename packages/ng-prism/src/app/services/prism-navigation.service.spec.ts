import { Injector, runInInjectionContext } from '@angular/core';
import type {
  RuntimeComponent,
  RuntimeManifest,
} from '../../plugin/plugin.types.js';
import { PRISM_MANIFEST } from '../tokens/prism-tokens.js';
import { PrismManifestService } from './prism-manifest.service.js';
import { PrismNavigationService } from './prism-navigation.service.js';
import { PrismSearchService } from './prism-search.service.js';

function createComponent(
  overrides: Partial<{
    title: string;
    category: string;
    className: string;
    section: string;
    sectionOrder: number;
    isDirective: boolean;
  }> = {}
): RuntimeComponent {
  return {
    type: class {} as any,
    meta: {
      className: overrides.className ?? 'Comp',
      filePath: '/test.ts',
      showcaseConfig: {
        title: overrides.title ?? 'Default',
        category: overrides.category,
        section: overrides.section,
        sectionOrder: overrides.sectionOrder,
      },
      inputs: [],
      outputs: [],
      componentMeta: {
        selector: 'test',
        standalone: true,
        isDirective: overrides.isDirective ?? false,
      },
    },
  };
}

function setup(manifest: RuntimeManifest): {
  service: PrismNavigationService;
  manifestService: PrismManifestService;
} {
  const rootInjector = Injector.create({
    providers: [{ provide: PRISM_MANIFEST, useValue: manifest }],
  });
  const manifestService = runInInjectionContext(
    rootInjector,
    () => new PrismManifestService()
  );
  const searchService = runInInjectionContext(
    Injector.create({
      providers: [{ provide: PrismManifestService, useValue: manifestService }],
      parent: rootInjector,
    }),
    () => new PrismSearchService()
  );
  const navInjector = Injector.create({
    providers: [
      { provide: PrismManifestService, useValue: manifestService },
      { provide: PrismSearchService, useValue: searchService },
    ],
    parent: rootInjector,
  });
  const service = runInInjectionContext(
    navInjector,
    () => new PrismNavigationService()
  );
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

  it('should select first component via selectFirst() when no pages exist', () => {
    const first = createComponent({ title: 'Alpha', className: 'Alpha' });
    const second = createComponent({ title: 'Beta', className: 'Beta' });
    const { service } = setup({ components: [first, second] });
    service.selectFirst();
    expect(service.activeComponent()).toBe(first);
  });

  it('should prefer first page over first component in selectFirst()', () => {
    const comp = createComponent({ title: 'Alpha', className: 'Alpha' });
    const page = {
      type: 'component' as const,
      title: 'Intro',
      component: class {} as any,
    };
    const { service } = setup({ components: [comp], pages: [page] });
    service.selectFirst();
    expect(service.activePage()).toBe(page);
    expect(service.activeComponent()).toBeNull();
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
    expect(tree.get('Layout')).toEqual([{ kind: 'component', data: c }]);
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
    const { service, manifestService } = setup({
      components: [removed, survivor],
    });
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
    const page = {
      type: 'component' as const,
      title: 'Intro',
      category: 'Docs',
      component: class {} as any,
    };
    const { service, manifestService } = setup({
      components: [],
      pages: [page],
    });
    service.selectPage(page);

    const updatedPage = {
      type: 'component' as const,
      title: 'Intro',
      category: 'Docs',
      component: class {} as any,
    };
    manifestService.updateManifest({ components: [], pages: [updatedPage] });

    expect(service.activePage()).toBe(updatedPage);
    expect(service.activePage()).not.toBe(page);
  });

  describe('sectionTree', () => {
    it('puts @Component into "Components" section by default', () => {
      const comp = createComponent({ className: 'Foo' });
      const { service } = setup({ components: [comp] });

      const tree = service.sectionTree();
      expect(tree.map((s) => s.name)).toEqual(['Components']);
      expect(tree[0].categories[0].items[0].kind).toBe('component');
    });

    it('puts @Directive into "Directives" section by default', () => {
      const dir = createComponent({ className: 'HiDir', isDirective: true });
      const { service } = setup({ components: [dir] });

      const tree = service.sectionTree();
      expect(tree.map((s) => s.name)).toEqual(['Directives']);
    });

    it('puts components into both sections when mixed', () => {
      const comp = createComponent({ className: 'Btn' });
      const dir = createComponent({ className: 'HiDir', isDirective: true });
      const { service } = setup({ components: [comp, dir] });

      const tree = service.sectionTree();
      expect(tree.map((s) => s.name)).toEqual(['Components', 'Directives']);
    });

    it('respects explicit section override on @Directive', () => {
      const dir = createComponent({
        className: 'HiDir',
        isDirective: true,
        section: 'Behavior',
      });
      const { service } = setup({ components: [dir] });

      const tree = service.sectionTree();
      expect(tree.map((s) => s.name)).toEqual(['Behavior']);
    });

    it('orders sections: Components before Directives by default', () => {
      const dir = createComponent({ className: 'HiDir', isDirective: true });
      const comp = createComponent({ className: 'Btn' });
      const { service } = setup({ components: [dir, comp] });

      const tree = service.sectionTree();
      expect(tree.map((s) => s.name)).toEqual(['Components', 'Directives']);
    });

    it('orders sections by lowest sectionOrder among items', () => {
      const a = createComponent({
        className: 'A',
        section: 'Custom',
        sectionOrder: -5,
      });
      const b = createComponent({ className: 'B' });
      const { service } = setup({ components: [a, b] });

      const tree = service.sectionTree();
      expect(tree.map((s) => s.name)).toEqual(['Custom', 'Components']);
    });

    it('sorts custom sections alphabetically after Components/Directives when no sectionOrder', () => {
      const a = createComponent({ className: 'A', section: 'Zeta' });
      const b = createComponent({ className: 'B', section: 'Alpha' });
      const c = createComponent({ className: 'C' });
      const { service } = setup({ components: [a, b, c] });

      const tree = service.sectionTree();
      expect(tree.map((s) => s.name)).toEqual(['Components', 'Alpha', 'Zeta']);
    });

    it('groups items inside a section by category', () => {
      const a = createComponent({
        className: 'A',
        category: 'Forms',
      });
      const b = createComponent({
        className: 'B',
        category: 'Forms',
      });
      const c = createComponent({
        className: 'C',
        category: 'Layout',
      });
      const { service } = setup({ components: [a, b, c] });

      const tree = service.sectionTree();
      expect(tree).toHaveLength(1);
      expect(tree[0].name).toBe('Components');
      expect(tree[0].categories.map((c) => c.name)).toEqual([
        'Forms',
        'Layout',
      ]);
      expect(tree[0].categories[0].items).toHaveLength(2);
      expect(tree[0].categories[1].items).toHaveLength(1);
    });

    it('uses "Uncategorized" when category is missing', () => {
      const comp = createComponent({ className: 'Foo' });
      const { service } = setup({ components: [comp] });

      const tree = service.sectionTree();
      expect(tree[0].categories[0].name).toBe('Uncategorized');
    });

    it('exposes totalCount per section', () => {
      const a = createComponent({ className: 'A' });
      const b = createComponent({ className: 'B' });
      const c = createComponent({
        className: 'C',
        isDirective: true,
      });
      const { service } = setup({ components: [a, b, c] });

      const tree = service.sectionTree();
      const comps = tree.find((s) => s.name === 'Components');
      const dirs = tree.find((s) => s.name === 'Directives');
      expect(comps?.totalCount).toBe(2);
      expect(dirs?.totalCount).toBe(1);
    });
  });
});
