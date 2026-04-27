import { Component, computed, effect, inject, untracked, HostListener, ChangeDetectionStrategy } from '@angular/core';
import type { NgPrismConfig } from '../../plugin/plugin.types.js';
import { PRISM_CONFIG } from '../tokens/prism-tokens.js';
import { PrismThemeService } from '../services/prism-theme.service.js';
import { PrismLayoutService } from '../services/prism-layout.service.js';
import { PrismNavigationService } from '../services/prism-navigation.service.js';
import { PrismPanelService } from '../services/prism-panel.service.js';
import { PrismPluginService } from '../services/prism-plugin.service.js';
import { PrismComponentHeadComponent } from '../component-head/prism-component-head.component.js';
import { PrismVariantRibbonComponent } from '../variant-ribbon/prism-variant-ribbon.component.js';
import { PrismHeaderComponent } from '../header/prism-header.component.js';
import { PrismPanelHostComponent } from '../panels/panel-host/prism-panel-host.component.js';
import { PrismRendererComponent } from '../renderer/prism-renderer.component.js';
import { PrismSidebarComponent } from '../sidebar/prism-sidebar.component.js';
import { PrismPageRendererComponent } from '../page-renderer/prism-page-renderer.component.js';
import { BUILTIN_PANELS } from '../panels/builtin-panels.js';
import { PrismUrlStateService } from '../services/prism-url-state.service.js';
import { PrismViewTabBarComponent } from '../view-tab-bar/prism-view-tab-bar.component.js';
import { PrismViewPanelHostComponent } from '../view-tab-bar/prism-view-panel-host.component.js';
import { PrismResizerDirective } from '../directives/prism-resizer.directive.js';
import { PrismCanvasToolbarComponent } from '../canvas/prism-canvas-toolbar.component.js';
import { PrismCodeDrawerComponent } from '../canvas/prism-code-drawer.component.js';

@Component({
  selector: 'prism-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PrismHeaderComponent,
    PrismSidebarComponent,
    PrismComponentHeadComponent,
    PrismVariantRibbonComponent,
    PrismRendererComponent,
    PrismPanelHostComponent,
    PrismPageRendererComponent,
    PrismViewTabBarComponent,
    PrismViewPanelHostComponent,
    PrismResizerDirective,
    PrismCanvasToolbarComponent,
    PrismCodeDrawerComponent,
  ],
  template: `
    <div class="prism-shell" [style]="shellStyle()">
      <prism-header class="prism-shell__header" />

      <div class="prism-body" [class.prism-body--no-sidebar]="!layout.sidebarVisible()">
        @if (layout.sidebarVisible()) {
          <aside class="prism-sidebar-wrap">
            <prism-sidebar />
            <div class="prism-sidebar-foot">
              <span>Powered by ng-prism</span>
            </div>
          </aside>
          <div
            class="prism-resizer-col"
            prismResizer
            axis="x"
            [min]="200"
            [max]="360"
            [value]="layout.sidebarWidth()"
            (valueChange)="layout.setSidebarWidth($event)"
          ></div>
        }

        <main class="prism-main" [style.--ph.px]="showPanel() ? layout.panelHeight() : 0">
          @if (navigationService.activeComponent()) {
            @if (viewPanels().length > 0) {
              <prism-view-tab-bar class="prism-main__view-bar" />
            }

            @if (panelService.activeViewId() === 'renderer') {
              @if (layout.toolbarVisible()) {
                <prism-component-head />
                <prism-variant-ribbon />
              }
              <div class="prism-canvas-wrap">
                <prism-canvas-toolbar />
                <prism-renderer />
              </div>
              <prism-code-drawer class="prism-main__code-drawer" />
            } @else {
              <prism-view-panel-host class="prism-main__canvas" />
            }

            @if (showPanel()) {
              <div
                class="prism-resizer-row"
                prismResizer
                axis="y"
                [min]="200"
                [max]="560"
                [value]="layout.panelHeight()"
                (valueChange)="layout.setPanelHeight($event)"
              ></div>
              <div class="prism-main__panel">
                <prism-panel-host />
              </div>
            }
          } @else if (navigationService.activePage()) {
            <prism-page-renderer class="prism-main__canvas" />
          } @else {
            <div class="prism-shell__empty">
              <svg class="prism-shell__empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2L4 14h16L12 2z"/><path d="M4 14l4 8h8l4-8"/>
              </svg>
              <p class="prism-shell__empty-text">Select a component</p>
              <p class="prism-shell__empty-hint">from the sidebar to preview it here</p>
            </div>
          }
        </main>
      </div>
    </div>
  `,
  styles: `
    :host { display: block; height: 100%; }

    .prism-shell {
      height: 100vh;
      display: grid;
      grid-template-rows: 52px 1fr;
      background: var(--prism-void);
      font-family: var(--font-sans, var(--prism-font-sans));
      color: var(--prism-text);
      overflow: hidden;
    }

    .prism-body {
      display: grid;
      grid-template-columns: var(--sw, 264px) 4px 1fr;
      min-height: 0;
    }
    .prism-body--no-sidebar {
      grid-template-columns: 1fr;
    }

    .prism-sidebar-wrap {
      background: var(--prism-bg);
      border-right: 1px solid var(--prism-border);
      display: flex;
      flex-direction: column;
      min-height: 0;
      overflow: hidden;
    }

    .prism-sidebar-wrap prism-sidebar {
      flex: 1;
      min-height: 0;
    }

    .prism-sidebar-foot {
      border-top: 1px solid var(--prism-border);
      padding: 10px 14px;
      font-size: 11px;
      color: var(--prism-text-ghost);
      user-select: none;
    }

    .prism-resizer-col {
      width: 4px;
      background: transparent;
      transition: background var(--dur-fast) var(--ease-default);
      position: relative;
      z-index: 5;
    }
    .prism-resizer-col:hover,
    .prism-resizer-col.active {
      background: var(--prism-primary);
    }

    .prism-main {
      display: flex;
      flex-direction: column;
      min-height: 0;
      background: var(--prism-void);
      overflow: hidden;
    }

    .prism-resizer-row {
      flex-shrink: 0;
      height: 4px;
      background: transparent;
      transition: background var(--dur-fast) var(--ease-default);
      position: relative;
      z-index: 5;
    }
    .prism-resizer-row:hover,
    .prism-resizer-row.active {
      background: var(--prism-primary);
    }

    .prism-canvas-wrap {
      flex: 1;
      min-height: 0;
      display: grid;
      grid-template-rows: auto minmax(0, 1fr);
      background: var(--prism-bg-surface);
      overflow: hidden;
    }
    .prism-main__code-drawer { flex-shrink: 0; }
    .prism-main__view-bar { flex-shrink: 0; }
    .prism-main__canvas { flex: 1; min-height: 0; overflow: auto; }

    .prism-main__panel {
      height: var(--ph, 260px);
      flex-shrink: 0;
      overflow: hidden;
      min-height: 0;
    }

    .prism-shell__empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      grid-row: 1 / -1;
    }
    .prism-shell__empty-icon {
      width: 48px;
      height: 48px;
      color: var(--prism-text-ghost);
      margin-bottom: 8px;
    }
    .prism-shell__empty-text {
      margin: 0;
      font-size: var(--fs-xl);
      font-weight: 500;
      color: var(--prism-text-muted);
    }
    .prism-shell__empty-hint {
      margin: 0;
      font-size: var(--fs-lg);
      color: var(--prism-text-ghost);
    }
  `,
})
export class PrismShellComponent {
  private readonly config = inject<NgPrismConfig>(PRISM_CONFIG);
  protected readonly navigationService = inject(PrismNavigationService);
  private readonly themeService = inject(PrismThemeService);
  protected readonly layout = inject(PrismLayoutService);
  protected readonly panelService = inject(PrismPanelService);
  private readonly pluginService = inject(PrismPluginService);
  private readonly urlStateService = inject(PrismUrlStateService);

  protected readonly viewPanels = computed(() => [
    ...BUILTIN_PANELS.filter((p) => p.placement === 'view'),
    ...this.pluginService.viewPanels(),
  ]);

  protected readonly showPanel = computed(() =>
    this.layout.addonsVisible()
    && this.panelService.activeViewId() === 'renderer'
    && !this.navigationService.activePage()
  );

  protected readonly shellStyle = computed(() => {
    const sw = this.layout.sidebarVisible() ? this.layout.sidebarWidth() : 0;
    return `--sw: ${sw}px;`;
  });

  constructor() {
    this.themeService.applyConfigOverrides(this.config);
    this.navigationService.selectFirst();
    this.urlStateService.init();

    let lastItemKey: string | null = null;
    effect(() => {
      const item = this.navigationService.activeItem();
      const key = item
        ? (item.kind === 'component' ? item.data.meta.className : item.data.title)
        : null;
      if (lastItemKey !== null && lastItemKey !== key) {
        untracked(() => this.panelService.activeViewId.set('renderer'));
      }
      lastItemKey = key;
    });

    effect(() => {
      const item = this.navigationService.activeItem();
      const activeComp = this.navigationService.activeComponent();
      const activePage = this.navigationService.activePage();
      if (item !== null && activeComp === null && activePage === null) {
        untracked(() => this.navigationService.selectFirst());
      }
    });
  }

  @HostListener('document:keydown', ['$event'])
  protected onKeyDown(e: KeyboardEvent): void {
    if (!e.altKey) return;
    switch (e.key.toLowerCase()) {
      case 's': e.preventDefault(); this.layout.toggleSidebar(); break;
      case 't': e.preventDefault(); this.layout.toggleToolbar(); break;
      case 'a': e.preventDefault(); this.layout.toggleAddons(); break;
    }
  }
}
