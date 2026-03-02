import { Component, computed, inject, HostListener } from '@angular/core';
import type { NgPrismConfig } from '../../plugin/plugin.types.js';
import { PRISM_CONFIG } from '../tokens/prism-tokens.js';
import { PRISM_DARK_THEME, PRISM_LIGHT_THEME } from '../theme/prism-default-theme.js';
import { PrismThemeService } from '../services/prism-theme.service.js';
import { PrismLayoutService } from '../services/prism-layout.service.js';
import { PrismNavigationService } from '../services/prism-navigation.service.js';
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
    <div
      class="prism-shell"
      [style]="shellStyle()"
      [attr.data-sidebar]="layout.sidebarVisible() ? 'visible' : 'hidden'"
      [attr.data-addons]="layout.addonsVisible() ? 'visible' : 'hidden'"
      [attr.data-orientation]="layout.addonsOrientation()"
    >
      <prism-header class="prism-shell__header" />

      <aside class="prism-shell__sidebar">
        <prism-sidebar />
      </aside>
      <div
        class="prism-shell__sidebar-handle"
        (mousedown)="startSidebarResize($event)"
      ></div>

      <main class="prism-shell__main">
        @if (navigationService.activeComponent()) {
          @if (layout.toolbarVisible()) {
            <prism-component-header class="prism-shell__toolbar" />
          }
          <prism-renderer class="prism-shell__canvas" />
        } @else if (navigationService.activePage()) {
          <prism-page-renderer class="prism-shell__canvas" />
        } @else {
          <div class="prism-shell__empty">
            <div class="prism-shell__empty-inner">
              <svg class="prism-shell__empty-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L4 14h16L12 2z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
                <path d="M4 14l4 8h8l4-8" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
              </svg>
              <p class="prism-shell__empty-text">Select a component</p>
              <p class="prism-shell__empty-hint">from the sidebar to preview it here</p>
            </div>
          </div>
        }
      </main>

      @if (layout.addonsVisible()) {
        <div
          class="prism-shell__panel-handle"
          (mousedown)="startPanelResize($event)"
        ></div>
        <div class="prism-shell__panel">
          <prism-panel-host />
        </div>
      }
    </div>
  `,
  styles: `
    :host { display: block; height: 100%; }

    .prism-shell {
      display: grid;
      height: 100%;
      font-family: var(--prism-font-sans);
      color: var(--prism-text);
      background: var(--prism-bg);
      overflow: hidden;

      grid-template-columns: var(--sw) 4px 1fr;
      grid-template-rows: var(--prism-header-height) 1fr 4px var(--ph);
      grid-template-areas:
        "header  header  header"
        "sidebar shdrag  main"
        "sidebar shdrag  phdrag"
        "sidebar shdrag  panel";
    }

    .prism-shell[data-sidebar="hidden"] {
      grid-template-columns: 0 0 1fr;
    }

    .prism-shell[data-addons="hidden"] {
      grid-template-rows: var(--prism-header-height) 1fr;
      grid-template-areas:
        "header  header  header"
        "sidebar shdrag  main";
    }

    .prism-shell[data-orientation="right"][data-addons="visible"] {
      grid-template-columns: var(--sw) 4px 1fr 4px var(--pw);
      grid-template-rows: var(--prism-header-height) 1fr;
      grid-template-areas:
        "header  header  header  header  header"
        "sidebar shdrag  main    phdrag  panel";
    }

    .prism-shell__header  { grid-area: header; }
    .prism-shell__sidebar { grid-area: sidebar; overflow: hidden; min-width: 0; background: var(--prism-bg); }
    .prism-shell__main    { grid-area: main; display: flex; flex-direction: column; overflow: hidden; min-height: 0; }
    .prism-shell__panel   { grid-area: panel; overflow: hidden; min-height: 0; min-width: 0; }

    .prism-shell__sidebar-handle {
      grid-area: shdrag;
      cursor: col-resize;
      background: transparent;
      transition: background 0.15s;
      z-index: 10;
    }
    .prism-shell__sidebar-handle:hover { background: var(--prism-border); }

    .prism-shell__panel-handle {
      grid-area: phdrag;
      background: transparent;
      transition: background 0.15s;
      z-index: 10;
      cursor: row-resize;
    }
    .prism-shell__panel-handle:hover { background: var(--prism-border); }

    .prism-shell[data-orientation="right"] .prism-shell__panel-handle {
      cursor: col-resize;
    }

    .prism-shell__toolbar { flex-shrink: 0; }
    .prism-shell__canvas  { flex: 1; overflow: auto; min-height: 0; }

    .prism-shell__empty {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .prism-shell__empty-inner {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      text-align: center;
    }
    .prism-shell__empty-icon {
      width: 48px;
      height: 48px;
      color: var(--prism-text-ghost);
      margin-bottom: 8px;
    }
    .prism-shell__empty-text {
      margin: 0;
      font-size: 14px;
      font-weight: 500;
      color: var(--prism-text-muted);
    }
    .prism-shell__empty-hint {
      margin: 0;
      font-size: 13px;
      color: var(--prism-text-ghost);
    }
  `,
})
export class PrismShellComponent {
  private readonly config = inject<NgPrismConfig>(PRISM_CONFIG);
  protected readonly navigationService = inject(PrismNavigationService);
  private readonly themeService = inject(PrismThemeService);
  protected readonly layout = inject(PrismLayoutService);

  protected readonly shellStyle = computed(() => {
    const base = this.themeService.isDark() ? PRISM_DARK_THEME : PRISM_LIGHT_THEME;
    const merged = { ...base, ...(this.config.theme ?? {}) };
    const tokens = Object.entries(merged).map(([k, v]) => `${k}: ${v}`).join('; ');
    const sw = this.layout.sidebarVisible() ? this.layout.sidebarWidth() : 0;
    const ph = this.layout.addonsOrientation() === 'bottom' ? this.layout.panelHeight() : 0;
    const pw = this.layout.addonsOrientation() === 'right' ? this.layout.panelWidth() : 0;
    return `${tokens}; --sw: ${sw}px; --ph: ${ph}px; --pw: ${pw}px;`;
  });

  constructor() {
    this.navigationService.selectFirst();
  }

  @HostListener('document:keydown', ['$event'])
  protected onKeyDown(e: KeyboardEvent): void {
    if (!e.altKey) return;
    switch (e.key.toLowerCase()) {
      case 's': e.preventDefault(); this.layout.toggleSidebar(); break;
      case 't': e.preventDefault(); this.layout.toggleToolbar(); break;
      case 'a': e.preventDefault(); this.layout.toggleAddons(); break;
      case 'd': e.preventDefault(); this.layout.toggleOrientation(); break;
    }
  }

  protected startSidebarResize(e: MouseEvent): void {
    e.preventDefault();
    const startX = e.clientX;
    const startW = this.layout.sidebarWidth();
    const onMove = (ev: MouseEvent) => this.layout.setSidebarWidth(startW + ev.clientX - startX);
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  protected startPanelResize(e: MouseEvent): void {
    e.preventDefault();
    const isRight = this.layout.addonsOrientation() === 'right';
    if (isRight) {
      const startX = e.clientX;
      const startW = this.layout.panelWidth();
      const onMove = (ev: MouseEvent) => this.layout.setPanelWidth(startW - (ev.clientX - startX));
      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    } else {
      const startY = e.clientY;
      const startH = this.layout.panelHeight();
      const onMove = (ev: MouseEvent) => this.layout.setPanelHeight(startH - (ev.clientY - startY));
      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    }
  }
}
