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
    const cats = new Set<string>();
    for (const comp of this.manifest.components) {
      cats.add(comp.meta.showcaseConfig.category ?? 'Uncategorized');
    }
    for (const page of (this.manifest.pages ?? [])) {
      cats.add(page.category ?? 'Uncategorized');
    }
    return [...cats].sort();
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
