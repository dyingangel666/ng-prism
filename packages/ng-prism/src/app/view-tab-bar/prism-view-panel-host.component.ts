import { NgComponentOutlet } from '@angular/common';
import { Component, computed, createEnvironmentInjector, effect, EnvironmentInjector, inject, OnDestroy, signal, type Type } from '@angular/core';
import { BUILTIN_PANELS } from '../panels/builtin-panels.js';
import { PrismNavigationService } from '../services/prism-navigation.service.js';
import { PrismPanelService } from '../services/prism-panel.service.js';
import { PrismPluginService } from '../services/prism-plugin.service.js';

@Component({
  selector: 'prism-view-panel-host',
  standalone: true,
  imports: [NgComponentOutlet],
  template: `
    <div class="prism-view-panel-host">
      @if (resolvedComponent()) {
        <ng-container *ngComponentOutlet="resolvedComponent(); inputs: panelInputs(); injector: activeInjector()" />
      }
    </div>
  `,
  styles: `
    .prism-view-panel-host {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: auto;
      background: var(--prism-bg-elevated);
    }
  `,
})
export class PrismViewPanelHostComponent implements OnDestroy {
  private readonly pluginService = inject(PrismPluginService);
  private readonly nav = inject(PrismNavigationService);
  protected readonly panelService = inject(PrismPanelService);
  private readonly envInjector = inject(EnvironmentInjector);

  private readonly allViewPanels = computed(() => [
    ...BUILTIN_PANELS.filter((p) => p.placement === 'view'),
    ...this.pluginService.viewPanels(),
  ]);

  protected readonly resolvedComponent = signal<Type<unknown> | null>(null);
  protected readonly panelInputs = computed(() => ({
    activeComponent: this.nav.activeComponent(),
  }));

  private readonly lazyCache = new Map<string, Type<unknown>>();
  private readonly injectorCache = new Map<string, EnvironmentInjector>();

  protected readonly activeInjector = computed(() => {
    const panelId = this.panelService.activeViewId();
    const panel = this.allViewPanels().find((p) => p.id === panelId);
    if (!panel?.providers?.length) return this.envInjector;

    if (!this.injectorCache.has(panel.id)) {
      this.injectorCache.set(
        panel.id,
        createEnvironmentInjector(panel.providers, this.envInjector, `PrismViewPanel[${panel.id}]`),
      );
    }
    return this.injectorCache.get(panel.id)!;
  });

  constructor() {
    effect(() => {
      const panel = this.allViewPanels().find((p) => p.id === this.panelService.activeViewId()) ?? null;
      if (!panel) {
        this.resolvedComponent.set(null);
        return;
      }

      if (panel.component) {
        this.resolvedComponent.set(panel.component);
        return;
      }

      if (panel.loadComponent) {
        const cached = this.lazyCache.get(panel.id);
        if (cached) {
          this.resolvedComponent.set(cached);
          return;
        }

        this.resolvedComponent.set(null);
        panel.loadComponent().then((comp) => {
          this.lazyCache.set(panel.id, comp);
          this.resolvedComponent.set(comp);
        });
      }
    });
  }

  ngOnDestroy(): void {
    this.injectorCache.forEach((injector) => injector.destroy());
  }
}
