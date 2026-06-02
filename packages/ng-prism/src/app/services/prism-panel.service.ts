import {
  computed,
  createEnvironmentInjector,
  EnvironmentInjector,
  inject,
  Injectable,
  signal,
} from '@angular/core';
import { PRISM_BUILTIN_PANELS } from '../tokens/prism-tokens.js';
import { PrismPluginService } from './prism-plugin.service.js';

@Injectable({ providedIn: 'root' })
export class PrismPanelService {
  private readonly envInjector = inject(EnvironmentInjector);
  private readonly pluginService = inject(PrismPluginService);
  private readonly builtinPanels = inject(PRISM_BUILTIN_PANELS);
  private readonly injectorCache = new Map<string, EnvironmentInjector>();

  readonly activePanelId = signal<string>('controls');
  readonly activeViewId = signal<string>('renderer');

  readonly activePanelInjector = computed<EnvironmentInjector | null>(() =>
    this.getInjector(this.activePanelId())
  );

  /**
   * Returns (and lazily creates) the EnvironmentInjector scoped to the given panel.
   * Returns `null` when the panel has no providers.
   */
  getInjector(panelId: string): EnvironmentInjector | null {
    const allPanels = [...this.builtinPanels, ...this.pluginService.panels()];
    const panel = allPanels.find((p) => p.id === panelId);
    if (!panel?.providers?.length) return null;

    let injector = this.injectorCache.get(panel.id);
    if (!injector) {
      injector = createEnvironmentInjector(
        panel.providers,
        this.envInjector,
        `PrismPanel[${panel.id}]`
      );
      this.injectorCache.set(panel.id, injector);
    }
    return injector;
  }
}
