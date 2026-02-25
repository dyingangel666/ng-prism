import { computed, inject, Injectable, signal } from '@angular/core';
import type { RuntimeComponent } from '../../plugin/plugin.types.js';
import type { StyleguidePage } from '../../plugin/page.types.js';
import type { NavigationItem } from './navigation-item.types.js';
import { PrismSearchService } from './prism-search.service.js';

@Injectable({ providedIn: 'root' })
export class PrismNavigationService {
  private readonly searchService = inject(PrismSearchService);

  readonly activeItem = signal<NavigationItem | null>(null);

  readonly activeComponent = computed<RuntimeComponent | null>(() => {
    const item = this.activeItem();
    return item?.kind === 'component' ? item.data : null;
  });

  readonly activePage = computed<StyleguidePage | null>(() => {
    const item = this.activeItem();
    return item?.kind === 'page' ? item.data : null;
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

    return map;
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
