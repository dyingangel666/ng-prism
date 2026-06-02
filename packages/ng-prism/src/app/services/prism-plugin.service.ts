import { computed, inject, Injectable } from '@angular/core';
import type {
  ControlDefinition,
  HeaderWidgetDefinition,
  PanelDefinition,
} from '../../plugin/plugin.types.js';
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
    this.panels().filter((p) => p.placement !== 'view')
  );

  readonly viewPanels = computed<PanelDefinition[]>(() =>
    this.panels().filter((p) => p.placement === 'view')
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

  readonly headerWidgets = computed<HeaderWidgetDefinition[]>(() => {
    const result: HeaderWidgetDefinition[] = [];
    for (const plugin of this.config.plugins ?? []) {
      if (plugin.headerWidgets) {
        result.push(...plugin.headerWidgets);
      }
    }
    return result.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  });

  readonly headerWidgetsStart = computed<HeaderWidgetDefinition[]>(() =>
    this.headerWidgets().filter((w) => w.placement === 'start')
  );

  readonly headerWidgetsEnd = computed<HeaderWidgetDefinition[]>(() =>
    this.headerWidgets().filter((w) => (w.placement ?? 'end') === 'end')
  );
}
