import { computed, inject, Injectable, signal } from '@angular/core';
import type {
  RuntimeComponent,
  ScannedComponent,
} from '../../plugin/plugin.types.js';
import type { StyleguidePage } from '../../plugin/page.types.js';
import type { NavigationItem } from './navigation-item.types.js';
import { PrismManifestService } from './prism-manifest.service.js';
import { PrismSearchService } from './prism-search.service.js';

const DEFAULT_SECTION_ORDER: Record<string, number> = {
  Components: 0,
  Directives: 10,
};

const SECTION_TIEBREAK: readonly string[] = ['Components', 'Directives'];

export interface CategoryNode {
  name: string;
  items: NavigationItem[];
}

export interface SectionNode {
  name: string;
  order: number;
  totalCount: number;
  categories: CategoryNode[];
}

export function resolveSection(c: ScannedComponent): string {
  if (c.showcaseConfig.section) return c.showcaseConfig.section;
  return c.componentMeta.isDirective ? 'Directives' : 'Components';
}

function defaultSectionOrder(name: string): number {
  return DEFAULT_SECTION_ORDER[name] ?? 100;
}

function sectionTiebreak(a: string, b: string): number {
  const ia = SECTION_TIEBREAK.indexOf(a);
  const ib = SECTION_TIEBREAK.indexOf(b);
  if (ia !== -1 && ib !== -1) return ia - ib;
  if (ia !== -1) return -1;
  if (ib !== -1) return 1;
  return a.localeCompare(b);
}

@Injectable({ providedIn: 'root' })
export class PrismNavigationService {
  private readonly searchService = inject(PrismSearchService);
  private readonly manifestService = inject(PrismManifestService);

  readonly activeItem = signal<NavigationItem | null>(null);

  readonly activeComponent = computed<RuntimeComponent | null>(() => {
    const item = this.activeItem();
    if (item?.kind !== 'component') return null;
    const manifest = this.manifestService.manifest();
    const relinked = manifest.components.find(
      (c) => c.meta.className === item.data.meta.className
    );
    return relinked ?? null;
  });

  readonly activePage = computed<StyleguidePage | null>(() => {
    const item = this.activeItem();
    if (item?.kind !== 'page') return null;
    const manifest = this.manifestService.manifest();
    const relinked = manifest.pages?.find(
      (p) => p.title === item.data.title && p.type === item.data.type
    );
    return relinked ?? null;
  });

  readonly categoryTree = computed<Map<string, NavigationItem[]>>(() => {
    const map = new Map<string, NavigationItem[]>();

    for (const comp of this.searchService.filteredComponents()) {
      const cat = comp.meta.showcaseConfig.category ?? 'Uncategorized';
      const list = map.get(cat) ?? [];
      list.push({ kind: 'component', data: comp });
      map.set(cat, list);
    }

    for (const page of this.searchService.filteredPages()) {
      const cat = page.category ?? 'Uncategorized';
      const list = map.get(cat) ?? [];
      list.push({ kind: 'page', data: page });
      map.set(cat, list);
    }

    for (const items of map.values()) {
      items.sort((a, b) => {
        const orderA =
          a.kind === 'component'
            ? a.data.meta.showcaseConfig.componentOrder ?? Infinity
            : a.data.order ?? Infinity;
        const orderB =
          b.kind === 'component'
            ? b.data.meta.showcaseConfig.componentOrder ?? Infinity
            : b.data.order ?? Infinity;
        if (orderA !== orderB) return orderA - orderB;
        const labelA =
          a.kind === 'component'
            ? a.data.meta.showcaseConfig.title
            : a.data.title;
        const labelB =
          b.kind === 'component'
            ? b.data.meta.showcaseConfig.title
            : b.data.title;
        return labelA.localeCompare(labelB);
      });
    }

    const sorted = [...map.entries()].sort(([catA, itemsA], [catB, itemsB]) => {
      const catOrders = itemsA.map((i) =>
        i.kind === 'component'
          ? i.data.meta.showcaseConfig.categoryOrder ?? Infinity
          : i.data.categoryOrder ?? Infinity
      );
      const orderA = Math.min(...catOrders);
      const catOrdersB = itemsB.map((i) =>
        i.kind === 'component'
          ? i.data.meta.showcaseConfig.categoryOrder ?? Infinity
          : i.data.categoryOrder ?? Infinity
      );
      const orderB = Math.min(...catOrdersB);
      if (orderA !== orderB) return orderA - orderB;
      return catA.localeCompare(catB);
    });

    return new Map(sorted);
  });

  readonly sectionTree = computed<SectionNode[]>(() => {
    const comps = this.searchService.filteredComponents();

    const sections = new Map<string, Map<string, NavigationItem[]>>();
    const sectionOrders = new Map<string, number>();

    for (const comp of comps) {
      const section = resolveSection(comp.meta);
      const category = comp.meta.showcaseConfig.category ?? 'Uncategorized';

      const catMap =
        sections.get(section) ?? new Map<string, NavigationItem[]>();
      const items = catMap.get(category) ?? [];
      items.push({ kind: 'component', data: comp });
      catMap.set(category, items);
      sections.set(section, catMap);

      const explicit = comp.meta.showcaseConfig.sectionOrder;
      const current = sectionOrders.get(section);
      if (explicit !== undefined) {
        sectionOrders.set(
          section,
          current === undefined ? explicit : Math.min(current, explicit)
        );
      }
    }

    const result: SectionNode[] = [];
    for (const [name, catMap] of sections.entries()) {
      const order = sectionOrders.get(name) ?? defaultSectionOrder(name);

      const categories: CategoryNode[] = [];
      for (const [catName, items] of catMap.entries()) {
        items.sort((a, b) => {
          const oa =
            a.kind === 'component'
              ? a.data.meta.showcaseConfig.componentOrder ?? Infinity
              : Infinity;
          const ob =
            b.kind === 'component'
              ? b.data.meta.showcaseConfig.componentOrder ?? Infinity
              : Infinity;
          if (oa !== ob) return oa - ob;
          const la =
            a.kind === 'component' ? a.data.meta.showcaseConfig.title : '';
          const lb =
            b.kind === 'component' ? b.data.meta.showcaseConfig.title : '';
          return la.localeCompare(lb);
        });
        categories.push({ name: catName, items });
      }

      categories.sort((a, b) => {
        const oa = Math.min(
          ...a.items.map((i) =>
            i.kind === 'component'
              ? i.data.meta.showcaseConfig.categoryOrder ?? Infinity
              : Infinity
          )
        );
        const ob = Math.min(
          ...b.items.map((i) =>
            i.kind === 'component'
              ? i.data.meta.showcaseConfig.categoryOrder ?? Infinity
              : Infinity
          )
        );
        if (oa !== ob) return oa - ob;
        return a.name.localeCompare(b.name);
      });

      const totalCount = categories.reduce((sum, c) => sum + c.items.length, 0);
      result.push({ name, order, totalCount, categories });
    }

    result.sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      return sectionTiebreak(a.name, b.name);
    });

    return result;
  });

  select(comp: RuntimeComponent): void {
    this.activeItem.set({ kind: 'component', data: comp });
  }

  selectPage(page: StyleguidePage): void {
    this.activeItem.set({ kind: 'page', data: page });
  }

  selectFirst(): void {
    const pages = this.searchService.filteredPages();
    if (pages.length > 0) {
      this.activeItem.set({ kind: 'page', data: pages[0] });
      return;
    }
    const comps = this.searchService.filteredComponents();
    if (comps.length > 0) {
      this.activeItem.set({ kind: 'component', data: comps[0] });
      return;
    }
    this.activeItem.set(null);
  }
}
