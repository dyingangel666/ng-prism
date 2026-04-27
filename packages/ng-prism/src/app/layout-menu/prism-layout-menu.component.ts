import { Component, inject, signal } from '@angular/core';
import { PrismLayoutService } from '../services/prism-layout.service.js';

@Component({
  selector: 'prism-layout-menu',
  standalone: true,
  template: `
    <div class="layout-menu">
      <button
        class="layout-menu__trigger"
        (click)="open.set(!open())"
        [class.layout-menu__trigger--active]="open()"
        title="Layout options"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="3" r="1.25" fill="currentColor"/>
          <circle cx="8" cy="8" r="1.25" fill="currentColor"/>
          <circle cx="8" cy="13" r="1.25" fill="currentColor"/>
        </svg>
      </button>
      @if (open()) {
        <div class="layout-menu__backdrop" (click)="open.set(false)"></div>
        <div class="layout-menu__dropdown">
          <button class="layout-menu__item" (click)="toggle('sidebar')">
            <span class="layout-menu__check" [class.layout-menu__check--on]="layout.sidebarVisible()">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 6l3 3 5-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </span>
            <span class="layout-menu__label">Show sidebar</span>
            <span class="layout-menu__kbd"><kbd>⌥</kbd><kbd>S</kbd></span>
          </button>
          <button class="layout-menu__item" (click)="toggle('toolbar')">
            <span class="layout-menu__check" [class.layout-menu__check--on]="layout.toolbarVisible()">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 6l3 3 5-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </span>
            <span class="layout-menu__label">Show toolbar</span>
            <span class="layout-menu__kbd"><kbd>⌥</kbd><kbd>T</kbd></span>
          </button>
          <button class="layout-menu__item" (click)="toggle('addons')">
            <span class="layout-menu__check" [class.layout-menu__check--on]="layout.addonsVisible()">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 6l3 3 5-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </span>
            <span class="layout-menu__label">Show addons panel</span>
            <span class="layout-menu__kbd"><kbd>⌥</kbd><kbd>A</kbd></span>
          </button>
        </div>
      }
    </div>
  `,
  styles: `
    .layout-menu { position: relative; }

    .layout-menu__trigger {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 30px;
      height: 30px;
      border: 1px solid var(--prism-border);
      border-radius: var(--prism-radius-sm);
      background: transparent;
      color: var(--prism-text-muted);
      cursor: pointer;
      transition: border-color 0.15s, color 0.15s, background 0.15s;
    }
    .layout-menu__trigger:hover,
    .layout-menu__trigger--active {
      border-color: var(--prism-border-strong);
      color: var(--prism-text);
      background: var(--prism-bg-surface);
    }

    .layout-menu__backdrop {
      position: fixed;
      inset: 0;
      z-index: 40;
    }

    .layout-menu__dropdown {
      position: absolute;
      top: calc(100% + 6px);
      right: 0;
      z-index: 50;
      min-width: 240px;
      background: var(--prism-bg-elevated);
      border: 1px solid var(--prism-border-strong);
      border-radius: var(--prism-radius);
      box-shadow: 0 8px 32px rgba(0,0,0,0.4);
      padding: 4px;
    }

    .layout-menu__item {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      padding: 7px 10px;
      border: none;
      background: none;
      color: var(--prism-text);
      font-family: var(--prism-font-sans);
      font-size: 13px;
      cursor: pointer;
      border-radius: var(--prism-radius-sm);
      text-align: left;
      transition: background 0.1s;
    }
    .layout-menu__item:hover { background: var(--prism-bg-surface); }

    .layout-menu__check {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 16px;
      border: 1px solid var(--prism-border-strong);
      border-radius: 3px;
      flex-shrink: 0;
      color: transparent;
    }
    .layout-menu__check--on {
      background: var(--prism-primary);
      border-color: var(--prism-primary);
      color: white;
    }

    .layout-menu__icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 16px;
      color: var(--prism-text-muted);
      flex-shrink: 0;
    }

    .layout-menu__label { flex: 1; }

    .layout-menu__kbd {
      display: flex;
      gap: 2px;
      opacity: 0.6;
    }
    kbd {
      font-family: var(--prism-font-sans);
      font-size: 11px;
      padding: 1px 4px;
      border: 1px solid var(--prism-border-strong);
      border-radius: 3px;
      background: var(--prism-bg-surface);
      color: var(--prism-text-muted);
    }

    .layout-menu__divider {
      height: 1px;
      background: var(--prism-border);
      margin: 4px 0;
    }
  `,
})
export class PrismLayoutMenuComponent {
  protected readonly layout = inject(PrismLayoutService);
  protected readonly open = signal(false);

  protected toggle(target: 'sidebar' | 'toolbar' | 'addons' | 'orientation'): void {
    this.open.set(false);
    switch (target) {
      case 'sidebar': this.layout.toggleSidebar(); break;
      case 'toolbar': this.layout.toggleToolbar(); break;
      case 'addons': this.layout.toggleAddons(); break;
      case 'orientation': this.layout.toggleOrientation(); break;
    }
  }
}
