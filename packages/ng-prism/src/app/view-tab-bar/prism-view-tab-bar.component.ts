import {
  Component,
  computed,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { BUILTIN_PANELS } from '../panels/builtin-panels.js';
import { PrismPanelService } from '../services/prism-panel.service.js';
import { PrismPluginService } from '../services/prism-plugin.service.js';

@Component({
  selector: 'prism-view-tab-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="prism-view-tab-bar">
      <button
        class="prism-view-tab-bar__tab"
        [class.prism-view-tab-bar__tab--active]="
          panelService.activeViewId() === 'renderer'
        "
        (click)="panelService.activeViewId.set('renderer')"
      >
        Playground
      </button>
      @for (panel of viewPanels(); track panel.id) {
      <button
        class="prism-view-tab-bar__tab"
        [class.prism-view-tab-bar__tab--active]="
          panelService.activeViewId() === panel.id
        "
        (click)="panelService.activeViewId.set(panel.id)"
      >
        {{ panel.label }}
      </button>
      }
    </div>
  `,
  styles: `
    :host { display: inline-flex; }

    .prism-view-tab-bar {
      display: inline-flex;
      gap: 2px;
      padding: 2px;
      border-radius: var(--radius-sm);
      background: var(--prism-input-bg);
    }

    .prism-view-tab-bar__tab {
      padding: 2px var(--sp-4);
      border: 0;
      border-radius: var(--radius-xs);
      background: none;
      font-family: var(--prism-font-sans);
      font-size: var(--fs-md);
      color: var(--prism-text-muted);
      cursor: pointer;
      white-space: nowrap;
      transition: color var(--dur-fast) var(--ease-default);
    }
    .prism-view-tab-bar__tab:hover { color: var(--prism-text-2); }
    .prism-view-tab-bar__tab:focus-visible {
      outline: 2px solid var(--prism-primary);
      outline-offset: 1px;
    }
    .prism-view-tab-bar__tab--active {
      background: var(--prism-bg-elevated);
      color: var(--prism-text);
      font-weight: 500;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.18);
    }
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
