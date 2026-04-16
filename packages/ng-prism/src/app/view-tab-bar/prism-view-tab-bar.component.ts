import { Component, computed, inject } from '@angular/core';
import { BUILTIN_PANELS } from '../panels/builtin-panels.js';
import { PrismPanelService } from '../services/prism-panel.service.js';
import { PrismPluginService } from '../services/prism-plugin.service.js';

@Component({
  selector: 'prism-view-tab-bar',
  standalone: true,
  template: `
    <div class="prism-view-tab-bar">
      <button
        class="prism-view-tab-bar__tab"
        [class.prism-view-tab-bar__tab--active]="panelService.activeViewId() === 'renderer'"
        (click)="panelService.activeViewId.set('renderer')"
      >
        Renderer
      </button>
      @for (panel of viewPanels(); track panel.id) {
        <button
          class="prism-view-tab-bar__tab"
          [class.prism-view-tab-bar__tab--active]="panelService.activeViewId() === panel.id"
          (click)="panelService.activeViewId.set(panel.id)"
        >
          {{ panel.label }}
        </button>
      }
    </div>
  `,
  styles: `
    .prism-view-tab-bar {
      display: flex;
      border-bottom: 1px solid var(--prism-border);
      padding: 0 8px;
      flex-shrink: 0;
      background: var(--prism-bg-elevated);
    }

    .prism-view-tab-bar__tab {
      padding: 9px 14px;
      font-size: 13px;
      font-family: var(--prism-font-sans);
      border: none;
      background: none;
      color: var(--prism-text-muted);
      cursor: pointer;
      position: relative;
      margin-bottom: -1px;
      transition: color 0.12s;
    }

    .prism-view-tab-bar__tab::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 8px;
      right: 8px;
      height: 2px;
      background: linear-gradient(90deg, var(--prism-primary-from), var(--prism-primary-to));
      opacity: 0;
      transition: opacity 0.12s;
    }

    .prism-view-tab-bar__tab:hover { color: var(--prism-text-2); }

    .prism-view-tab-bar__tab--active { color: var(--prism-primary); font-weight: 500; }

    .prism-view-tab-bar__tab--active::after { opacity: 1; }
  `,
})
export class PrismViewTabBarComponent {
  protected readonly panelService = inject(PrismPanelService);
  private readonly pluginService = inject(PrismPluginService);

  protected readonly viewPanels = computed(() => [
    ...BUILTIN_PANELS.filter((p) => p.placement === 'view'),
    ...this.pluginService.viewPanels(),
  ]);
}
