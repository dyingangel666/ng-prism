import { computed, inject, Injectable } from '@angular/core';
import type { ControlDefinition, PanelDefinition } from '../../plugin/plugin.types.js';
import { PRISM_CONFIG } from '../tokens/prism-tokens.js';

@Injectable({ providedIn: 'root' })
export class PrismPluginService {
  private readonly config = inject(PRISM_CONFIG);

  readonly panels = computed<PanelDefinition[]>(() => {
    const result: PanelDefinition[] = [];
    for (const plugin of this.config.plugins ?? []) {
      if (plugin.panels) {
        result.push(...plugin.panels);
      }
    }
    return result;
  });

  readonly addonPanels = computed<PanelDefinition[]>(() =>
    this.panels().filter((p) => p.placement !== 'view'),
  );

  readonly viewPanels = computed<PanelDefinition[]>(() =>
    this.panels().filter((p) => p.placement === 'view'),
  );

  readonly controls = computed<ControlDefinition[]>(() => {
    const result: ControlDefinition[] = [];
    for (const plugin of this.config.plugins ?? []) {
      if (plugin.controls) {
        result.push(...plugin.controls);
      }
    }
    return result;
  });
}
