import { computed, inject, Injectable, signal } from '@angular/core';
import type { RuntimeComponent } from '../../plugin/plugin.types.js';
import type { StyleguidePage } from '../../plugin/page.types.js';
import type { NavigationItem } from './navigation-item.types.js';
import { PrismManifestService } from './prism-manifest.service.js';
import { PrismSearchService } from './prism-search.service.js';

@Injectable({ providedIn: 'root' })
export class PrismNavigationService {
  private readonly searchService = inject(PrismSearchService);
  private readonly manifestService = inject(PrismManifestService);

  readonly activeItem = signal<NavigationItem | null>(null);

  readonly activeComponent = computed<RuntimeComponent | null>(() => {
    const item = this.activeItem();
    if (item?.kind !== 'component') return null;
    const manifest = this.manifestService.manifest();
    const relinked = manifest.components.find((c) => c.meta.className === item.data.meta.className);
    return relinked ?? null;
  });

  readonly activePage = computed<StyleguidePage | null>(() => {
    const item = this.activeItem();
    if (item?.kind !== 'page') return null;
    const manifest = this.manifestService.manifest();
    const relinked = manifest.pages?.find((p) => p.title === item.data.title && p.type === item.data.type);
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
        const orderA = a.kind === 'component'
          ? (a.data.meta.showcaseConfig.componentOrder ?? Infinity)
          : (a.data.order ?? Infinity);
        const orderB = b.kind === 'component'
          ? (b.data.meta.showcaseConfig.componentOrder ?? Infinity)
          : (b.data.order ?? Infinity);
        if (orderA !== orderB) return orderA - orderB;
        const labelA = a.kind === 'component' ? a.data.meta.showcaseConfig.title : a.data.title;
        const labelB = b.kind === 'component' ? b.data.meta.showcaseConfig.title : b.data.title;
        return labelA.localeCompare(labelB);
      });
    }

    const sorted = [...map.entries()].sort(([catA, itemsA], [catB, itemsB]) => {
      const catOrders = itemsA.map((i) =>
        i.kind === 'component'
          ? (i.data.meta.showcaseConfig.categoryOrder ?? Infinity)
          : (i.data.categoryOrder ?? Infinity),
      );
      const orderA = Math.min(...catOrders);
      const catOrdersB = itemsB.map((i) =>
        i.kind === 'component'
          ? (i.data.meta.showcaseConfig.categoryOrder ?? Infinity)
          : (i.data.categoryOrder ?? Infinity),
      );
      const orderB = Math.min(...catOrdersB);
      if (orderA !== orderB) return orderA - orderB;
      return catA.localeCompare(catB);
    });

    return new Map(sorted);
  });

  select(comp: RuntimeComponent): void {
    this.activeItem.set({ kind: 'component', data: comp });
  }

  selectPage(page: StyleguidePage): void {
    this.activeItem.set({ kind: 'page', data: page });
  }

  selectFirst(): void {
    const comps = this.searchService.filteredComponents();
    if (comps.length > 0) {
      this.activeItem.set({ kind: 'component', data: comps[0] });
      return;
    }
    const pages = this.searchService.filteredPages();
    if (pages.length > 0) {
      this.activeItem.set({ kind: 'page', data: pages[0] });
      return;
    }
    this.activeItem.set(null);
  }
}
