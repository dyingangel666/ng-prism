import { NgComponentOutlet } from '@angular/common';
import { Component, computed, effect, inject, signal, type Type } from '@angular/core';
import type { PanelDefinition } from '../../../plugin/plugin.types.js';
import { CONTROLS_PLUGIN } from '../controls/controls-plugin.js';
import { EVENTS_PLUGIN } from '../events/events-plugin.js';
import { PrismNavigationService } from '../../services/prism-navigation.service.js';
import { PrismPluginService } from '../../services/prism-plugin.service.js';

@Component({
  selector: 'prism-panel-host',
  standalone: true,
  imports: [NgComponentOutlet],
  template: `
    <div class="prism-panel-host">
      <div class="prism-panel-host__tabs">
        @for (panel of allPanels(); track panel.id) {
          <button
            class="prism-panel-host__tab"
            [class.prism-panel-host__tab--active]="activePanelId() === panel.id"
            (click)="activePanelId.set(panel.id)"
          >
            {{ panel.label }}
          </button>
        }
      </div>
      <div class="prism-panel-host__content">
        @if (resolvedComponent()) {
          <ng-container *ngComponentOutlet="resolvedComponent(); inputs: panelInputs()" />
        }
      </div>
    </div>
  `,
  styles: `
    .prism-panel-host {
      display: flex;
      flex-direction: column;
      min-height: var(--prism-panel-height);
      border-top: 1px solid var(--prism-border);
      background: var(--prism-bg-elevated);
    }
    .prism-panel-host__tabs {
      display: flex;
      gap: 0;
      border-bottom: 1px solid var(--prism-border);
      padding: 0 8px;
      flex-shrink: 0;
    }
    .prism-panel-host__tab {
      padding: 8px 16px;
      font-size: 13px;
      font-family: var(--prism-font-family);
      border: none;
      background: none;
      color: var(--prism-text-muted);
      cursor: pointer;
      position: relative;
      margin-bottom: -1px;
      transition: color 0.12s;
    }
    .prism-panel-host__tab::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 2px;
      background: linear-gradient(90deg, var(--prism-primary-from), var(--prism-primary-to));
      opacity: 0;
      transition: opacity 0.12s;
    }
    .prism-panel-host__tab:hover {
      color: var(--prism-text);
    }
    .prism-panel-host__tab--active {
      color: var(--prism-primary);
    }
    .prism-panel-host__tab--active::after {
      opacity: 1;
    }
    .prism-panel-host__content {
      flex: 1;
      overflow: hidden;
    }
  `,
})
export class PrismPanelHostComponent {
  private readonly pluginService = inject(PrismPluginService);
  private readonly nav = inject(PrismNavigationService);

  private readonly builtInPanels: PanelDefinition[] = [
    ...CONTROLS_PLUGIN.panels!,
    ...EVENTS_PLUGIN.panels!,
  ];

  protected readonly allPanels = () => [...this.builtInPanels, ...this.pluginService.panels()];
  protected readonly activePanelId = signal('controls');
  protected readonly resolvedComponent = signal<Type<unknown> | null>(null);
  protected readonly panelInputs = computed(() => ({
    activeComponent: this.nav.activeComponent(),
  }));

  private readonly lazyCache = new Map<string, Type<unknown>>();

  constructor() {
    effect(() => {
      const panel = this.allPanels().find((p) => p.id === this.activePanelId()) ?? null;
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
}
