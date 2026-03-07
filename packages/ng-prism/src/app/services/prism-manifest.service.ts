import { computed, inject, Injectable } from '@angular/core';
import type { RuntimeComponent } from '../../plugin/plugin.types.js';
import type { StyleguidePage } from '../../plugin/page.types.js';
import { PRISM_MANIFEST } from '../tokens/prism-tokens.js';

@Injectable({ providedIn: 'root' })
export class PrismManifestService {
  private readonly manifest = inject(PRISM_MANIFEST);

  readonly components = computed<RuntimeComponent[]>(() => this.manifest.components);

  readonly pages = computed<StyleguidePage[]>(() => this.manifest.pages ?? []);

  readonly categories = computed<string[]>(() => {
    const orderMap = new Map<string, number>();
    for (const comp of this.manifest.components) {
      const cat = comp.meta.showcaseConfig.category ?? 'Uncategorized';
      const order = comp.meta.showcaseConfig.categoryOrder ?? Infinity;
      if (!orderMap.has(cat) || order < orderMap.get(cat)!) {
        orderMap.set(cat, order);
      }
    }
    for (const page of (this.manifest.pages ?? [])) {
      const cat = page.category ?? 'Uncategorized';
      if (!orderMap.has(cat)) {
        orderMap.set(cat, Infinity);
      }
    }
    return [...orderMap.keys()].sort((a, b) => {
      const orderA = orderMap.get(a)!;
      const orderB = orderMap.get(b)!;
      if (orderA !== orderB) return orderA - orderB;
      return a.localeCompare(b);
    });
  });

  readonly groupedByCategory = computed<Map<string, RuntimeComponent[]>>(() => {
    const map = new Map<string, RuntimeComponent[]>();
    for (const comp of this.manifest.components) {
      const cat = comp.meta.showcaseConfig.category ?? 'Uncategorized';
      const list = map.get(cat) ?? [];
      list.push(comp);
      map.set(cat, list);
    }
    return map;
  });
}
