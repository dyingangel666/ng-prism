import {
  Component,
  computed,
  effect,
  inject,
  untracked,
  HostListener,
  ChangeDetectionStrategy,
} from '@angular/core';
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

      <div
        class="prism-body"
        [class.prism-body--no-sidebar]="!layout.sidebarVisible()"
      >
        @if (layout.sidebarVisible()) {
        <aside class="prism-sidebar-wrap">
          <prism-sidebar />
          <div class="prism-sidebar-foot">
            <img
              class="prism-sidebar-foot__logo"
              alt="ng-prism logo"
              src="data:image/png;base64,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"
            />
            <a
              class="prism-sidebar-foot__link"
              href="https://dyingangel666.github.io/ng-prism/#/"
              target="_blank"
              rel="noopener"
            >
              Powered by ng-prism
            </a>
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

        <main
          class="prism-main"
          [style.--ph.px]="showPanel() ? layout.panelHeight() : 0"
        >
          @if (navigationService.activeComponent()) { @if (viewPanels().length >
          0) {
          <prism-view-tab-bar class="prism-main__view-bar" />
          } @if (panelService.activeViewId() === 'renderer') { @if
          (layout.toolbarVisible()) {
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
          } @if (showPanel()) {
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
          } } @else if (navigationService.activePage()) {
          <prism-page-renderer class="prism-main__canvas" />
          } @else {
          <div class="prism-shell__empty">
            <svg
              class="prism-shell__empty-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M12 2L4 14h16L12 2z" />
              <path d="M4 14l4 8h8l4-8" />
            </svg>
            <p class="prism-shell__empty-text">Select a component</p>
            <p class="prism-shell__empty-hint">
              from the sidebar to preview it here
            </p>
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
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .prism-sidebar-foot__logo {
      width: 16px;
      flex-shrink: 0;
    }
    .prism-sidebar-foot__link {
      color: var(--prism-text-ghost);
      text-decoration: none;
      transition: color var(--dur-fast);
    }
    .prism-sidebar-foot__link:hover {
      color: var(--prism-text-2);
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

  protected readonly showPanel = computed(
    () =>
      this.layout.addonsVisible() &&
      this.panelService.activeViewId() === 'renderer' &&
      !this.navigationService.activePage()
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
        ? item.kind === 'component'
          ? item.data.meta.className
          : item.data.title
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
      case 's':
        e.preventDefault();
        this.layout.toggleSidebar();
        break;
      case 't':
        e.preventDefault();
        this.layout.toggleToolbar();
        break;
      case 'a':
        e.preventDefault();
        this.layout.toggleAddons();
        break;
    }
  }
}
