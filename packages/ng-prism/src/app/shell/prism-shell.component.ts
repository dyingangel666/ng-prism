import { Component, computed, inject } from '@angular/core';
import type { NgPrismConfig } from '../../plugin/plugin.types.js';
import { PrismNavigationService } from '../services/prism-navigation.service.js';
import { PRISM_CONFIG } from '../tokens/prism-tokens.js';
import { PRISM_DARK_THEME, PRISM_LIGHT_THEME } from '../theme/prism-default-theme.js';
import { PrismThemeService } from '../services/prism-theme.service.js';
import { PrismComponentHeaderComponent } from '../component-header/prism-component-header.component.js';
import { PrismHeaderComponent } from '../header/prism-header.component.js';
import { PrismPanelHostComponent } from '../panels/panel-host/prism-panel-host.component.js';
import { PrismRendererComponent } from '../renderer/prism-renderer.component.js';
import { PrismSidebarComponent } from '../sidebar/prism-sidebar.component.js';
import { PrismPageRendererComponent } from '../page-renderer/prism-page-renderer.component.js';

@Component({
  selector: 'prism-shell',
  standalone: true,
  imports: [
    PrismHeaderComponent,
    PrismSidebarComponent,
    PrismComponentHeaderComponent,
    PrismRendererComponent,
    PrismPanelHostComponent,
    PrismPageRendererComponent,
  ],
  template: `
    <div class="prism-shell" [style]="themeStyle()">
      <prism-header class="prism-shell__header" />
      <prism-sidebar class="prism-shell__sidebar" />
      <main class="prism-shell__main">
        @if (navigationService.activeComponent()) {
        <prism-component-header />
        <prism-renderer />
        <prism-panel-host />
        } @else if (navigationService.activePage()) {
        <prism-page-renderer />
        } @else {
        <div class="prism-shell__empty">
          <p>Select a component</p>
        </div>
        }
      </main>
    </div>
  `,
  styles: `
    :host {
      display: block;
      height: 100%;
    }
    .prism-shell {
      display: grid;
      grid-template-columns: var(--prism-sidebar-width) 1fr;
      grid-template-rows: var(--prism-header-height) 1fr;
      height: 100%;
      font-family: var(--prism-font-family);
      color: var(--prism-text);
      background: var(--prism-bg);
    }
    .prism-shell__header {
      grid-column: 1 / -1;
    }
    .prism-shell__sidebar {
      grid-row: 2;
    }
    .prism-shell__main {
      display: flex;
      flex-direction: column;
      min-height: calc(100vh - var(--prism-header-height));
      overflow: hidden;
      
      prism-renderer,
      prism-panel-host {
        flex: 1; 
        overflow: auto;
      }
    }
    .prism-shell__empty {
      display: flex;
      align-items: center;
      justify-content: center;
      flex: 1;
      color: var(--prism-text-muted);
      font-size: 14px;
    }
  `,
})
export class PrismShellComponent {
  private readonly config = inject<NgPrismConfig>(PRISM_CONFIG);
  protected readonly navigationService = inject(PrismNavigationService);
  private readonly themeService = inject(PrismThemeService);

  protected readonly themeStyle = computed(() => {
    const base = this.themeService.isDark() ? PRISM_DARK_THEME : PRISM_LIGHT_THEME;
    const merged = { ...base, ...(this.config.theme ?? {}) };
    return Object.entries(merged)
      .map(([k, v]) => `${k}: ${v}`)
      .join('; ');
  });

  constructor() {
    this.navigationService.selectFirst();
  }
}
