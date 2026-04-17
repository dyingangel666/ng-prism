# ng-prism UI/Layout Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the current static shell layout with a Storybook-inspired 2-column layout featuring resizable, toggleable panels and a complete visual redesign.

**Architecture:** A new `PrismLayoutService` manages all layout state (panel visibility, sizes, orientation) persisted to `localStorage`. The `PrismShellComponent` is rebuilt around CSS Grid with CSS custom properties driven by layout signals. Drag handles update layout service values; keyboard shortcuts call the same toggle methods.

**Tech Stack:** Angular 21 standalone components, Signal-based state (`signal`, `computed`, `effect`-free), CSS Grid, CSS Custom Properties, Jest 30 + SWC

---

## Phase 1 — Foundation

### Task 1: Token System Refresh

**Files:**
- Modify: `packages/ng-prism/src/app/theme/prism-default-theme.ts`

No tests needed — these are pure CSS value constants.

**Step 1: Replace the entire file with the new token system**

```typescript
export const PRISM_DARK_THEME: Record<string, string> = {
  '--prism-void': '#07050f',
  '--prism-bg': '#0d0b1c',
  '--prism-bg-surface': '#131022',
  '--prism-bg-elevated': '#1a1535',

  '--prism-text': '#ede9f8',
  '--prism-text-2': '#b0a6c8',
  '--prism-text-muted': '#6b5e80',
  '--prism-text-ghost': '#3a3355',

  '--prism-primary': '#a78bfa',
  '--prism-primary-from': '#7c3aed',
  '--prism-primary-to': '#3b82f6',
  '--prism-accent': '#ec4899',

  '--prism-border': 'rgba(255,255,255,0.08)',
  '--prism-border-strong': 'rgba(255,255,255,0.16)',
  '--prism-glow': 'rgba(139,92,246,0.18)',
  '--prism-glow-strong': 'rgba(139,92,246,0.35)',

  '--prism-input-bg': 'rgba(255,255,255,0.05)',
  '--prism-sidebar-bg': '#0d0b1c',

  '--prism-header-height': '52px',
  '--prism-toolbar-height': '40px',
  '--prism-font-sans': "'Inter', system-ui, -apple-system, sans-serif",
  '--prism-font-mono': "'Cascadia Code', 'Fira Code', ui-monospace, monospace",
  '--prism-radius-xs': '3px',
  '--prism-radius-sm': '5px',
  '--prism-radius': '8px',
  '--prism-radius-lg': '12px',

  '--prism-sidebar-width': '280px',
  '--prism-panel-height': '300px',
  '--prism-font-family': "'Inter', system-ui, -apple-system, sans-serif",
};

export const PRISM_LIGHT_THEME: Record<string, string> = {
  '--prism-void': '#f0ecff',
  '--prism-bg': '#faf8ff',
  '--prism-bg-surface': '#f3efff',
  '--prism-bg-elevated': '#ffffff',

  '--prism-text': '#1a0e2e',
  '--prism-text-2': '#4a3d65',
  '--prism-text-muted': '#6b5e80',
  '--prism-text-ghost': '#b0a6c8',

  '--prism-primary': '#6d28d9',
  '--prism-primary-from': '#7c3aed',
  '--prism-primary-to': '#2563eb',
  '--prism-accent': '#db2777',

  '--prism-border': 'rgba(109,40,217,0.12)',
  '--prism-border-strong': 'rgba(109,40,217,0.24)',
  '--prism-glow': 'rgba(109,40,217,0.10)',
  '--prism-glow-strong': 'rgba(109,40,217,0.20)',

  '--prism-input-bg': 'rgba(109,40,217,0.04)',
  '--prism-sidebar-bg': '#f3efff',

  '--prism-header-height': '52px',
  '--prism-toolbar-height': '40px',
  '--prism-font-sans': "'Inter', system-ui, -apple-system, sans-serif",
  '--prism-font-mono': "'Cascadia Code', 'Fira Code', ui-monospace, monospace",
  '--prism-radius-xs': '3px',
  '--prism-radius-sm': '5px',
  '--prism-radius': '8px',
  '--prism-radius-lg': '12px',

  '--prism-sidebar-width': '280px',
  '--prism-panel-height': '300px',
  '--prism-font-family': "'Inter', system-ui, -apple-system, sans-serif",
};

export const PRISM_DEFAULT_THEME = PRISM_DARK_THEME;
```

**Step 2: Run build to verify no breakage**

```bash
npx nx build ng-prism
```
Expected: build succeeds (token names are just CSS vars, no TS errors)

**Step 3: Commit**

```bash
git add packages/ng-prism/src/app/theme/prism-default-theme.ts
git commit -m "feat: refresh design tokens with extended hierarchy and new naming"
```

---

### Task 2: PrismLayoutService

**Files:**
- Create: `packages/ng-prism/src/app/services/prism-layout.service.ts`
- Create: `packages/ng-prism/src/app/services/prism-layout.service.spec.ts`

**Step 1: Write failing tests**

```typescript
// packages/ng-prism/src/app/services/prism-layout.service.spec.ts
import { Injector, runInInjectionContext } from '@angular/core';
import { PrismLayoutService } from './prism-layout.service.js';

function createService(): PrismLayoutService {
  return runInInjectionContext(
    Injector.create({ providers: [PrismLayoutService] }),
    () => new PrismLayoutService(),
  );
}

describe('PrismLayoutService', () => {
  beforeEach(() => localStorage.clear());

  it('should default to all panels visible', () => {
    const s = createService();
    expect(s.sidebarVisible()).toBe(true);
    expect(s.addonsVisible()).toBe(true);
    expect(s.toolbarVisible()).toBe(true);
  });

  it('should toggle sidebar', () => {
    const s = createService();
    s.toggleSidebar();
    expect(s.sidebarVisible()).toBe(false);
    s.toggleSidebar();
    expect(s.sidebarVisible()).toBe(true);
  });

  it('should toggle addons', () => {
    const s = createService();
    s.toggleAddons();
    expect(s.addonsVisible()).toBe(false);
  });

  it('should toggle toolbar', () => {
    const s = createService();
    s.toggleToolbar();
    expect(s.toolbarVisible()).toBe(false);
  });

  it('should default to bottom orientation', () => {
    const s = createService();
    expect(s.addonsOrientation()).toBe('bottom');
  });

  it('should cycle orientation between bottom and right', () => {
    const s = createService();
    s.toggleOrientation();
    expect(s.addonsOrientation()).toBe('right');
    s.toggleOrientation();
    expect(s.addonsOrientation()).toBe('bottom');
  });

  it('should clamp sidebar width to [160, 600]', () => {
    const s = createService();
    s.setSidebarWidth(50);
    expect(s.sidebarWidth()).toBe(160);
    s.setSidebarWidth(9999);
    expect(s.sidebarWidth()).toBe(600);
    s.setSidebarWidth(320);
    expect(s.sidebarWidth()).toBe(320);
  });

  it('should clamp panel height to [100, 600]', () => {
    const s = createService();
    s.setPanelHeight(20);
    expect(s.panelHeight()).toBe(100);
    s.setPanelHeight(9999);
    expect(s.panelHeight()).toBe(600);
  });

  it('should clamp panel width to [200, 600]', () => {
    const s = createService();
    s.setPanelWidth(50);
    expect(s.panelWidth()).toBe(200);
    s.setPanelWidth(9999);
    expect(s.panelWidth()).toBe(600);
  });

  it('should persist state to localStorage on mutation', () => {
    const s = createService();
    s.toggleSidebar();
    s.setSidebarWidth(340);
    const stored = JSON.parse(localStorage.getItem('ng-prism-layout')!);
    expect(stored.sidebarVisible).toBe(false);
    expect(stored.sidebarWidth).toBe(340);
  });

  it('should restore state from localStorage on construction', () => {
    localStorage.setItem('ng-prism-layout', JSON.stringify({
      sidebarVisible: false,
      sidebarWidth: 360,
      addonsOrientation: 'right',
    }));
    const s = createService();
    expect(s.sidebarVisible()).toBe(false);
    expect(s.sidebarWidth()).toBe(360);
    expect(s.addonsOrientation()).toBe('right');
  });

  it('should ignore malformed localStorage data', () => {
    localStorage.setItem('ng-prism-layout', 'not-json');
    expect(() => createService()).not.toThrow();
  });
});
```

**Step 2: Run tests — verify they fail**

```bash
npx nx test ng-prism -- --testPathPatterns=prism-layout.service
```
Expected: FAIL — `Cannot find module './prism-layout.service.js'`

**Step 3: Implement the service**

```typescript
// packages/ng-prism/src/app/services/prism-layout.service.ts
import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'ng-prism-layout';

@Injectable({ providedIn: 'root' })
export class PrismLayoutService {
  readonly sidebarVisible = signal(true);
  readonly addonsVisible = signal(true);
  readonly toolbarVisible = signal(true);
  readonly addonsOrientation = signal<'bottom' | 'right'>('bottom');
  readonly sidebarWidth = signal(280);
  readonly panelHeight = signal(300);
  readonly panelWidth = signal(320);

  constructor() {
    this.loadFromStorage();
  }

  toggleSidebar(): void {
    this.sidebarVisible.update(v => !v);
    this.saveToStorage();
  }

  toggleAddons(): void {
    this.addonsVisible.update(v => !v);
    this.saveToStorage();
  }

  toggleToolbar(): void {
    this.toolbarVisible.update(v => !v);
    this.saveToStorage();
  }

  toggleOrientation(): void {
    this.addonsOrientation.update(v => (v === 'bottom' ? 'right' : 'bottom'));
    this.saveToStorage();
  }

  setSidebarWidth(px: number): void {
    this.sidebarWidth.set(Math.max(160, Math.min(600, px)));
    this.saveToStorage();
  }

  setPanelHeight(px: number): void {
    this.panelHeight.set(Math.max(100, Math.min(600, px)));
    this.saveToStorage();
  }

  setPanelWidth(px: number): void {
    this.panelWidth.set(Math.max(200, Math.min(600, px)));
    this.saveToStorage();
  }

  private loadFromStorage(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const d = JSON.parse(raw) as Record<string, unknown>;
      if (typeof d['sidebarVisible'] === 'boolean') this.sidebarVisible.set(d['sidebarVisible']);
      if (typeof d['addonsVisible'] === 'boolean') this.addonsVisible.set(d['addonsVisible']);
      if (typeof d['toolbarVisible'] === 'boolean') this.toolbarVisible.set(d['toolbarVisible']);
      if (d['addonsOrientation'] === 'bottom' || d['addonsOrientation'] === 'right') {
        this.addonsOrientation.set(d['addonsOrientation']);
      }
      if (typeof d['sidebarWidth'] === 'number') this.setSidebarWidth(d['sidebarWidth']);
      if (typeof d['panelHeight'] === 'number') this.setPanelHeight(d['panelHeight']);
      if (typeof d['panelWidth'] === 'number') this.setPanelWidth(d['panelWidth']);
    } catch {}
  }

  private saveToStorage(): void {
    const data = {
      sidebarVisible: this.sidebarVisible(),
      addonsVisible: this.addonsVisible(),
      toolbarVisible: this.toolbarVisible(),
      addonsOrientation: this.addonsOrientation(),
      sidebarWidth: this.sidebarWidth(),
      panelHeight: this.panelHeight(),
      panelWidth: this.panelWidth(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }
}
```

**Step 4: Run tests — verify they pass**

```bash
npx nx test ng-prism -- --testPathPatterns=prism-layout.service
```
Expected: 12 tests PASS

**Step 5: Commit**

```bash
git add packages/ng-prism/src/app/services/prism-layout.service.ts \
        packages/ng-prism/src/app/services/prism-layout.service.spec.ts
git commit -m "feat: add PrismLayoutService with localStorage persistence"
```

---

## Phase 2 — Shell & Interactions

### Task 3: Shell Component Redesign

**Files:**
- Modify: `packages/ng-prism/src/app/shell/prism-shell.component.ts`

No unit tests for the shell (CSS/layout). Visual verification in browser.

**Step 1: Rewrite the shell component**

The shell becomes a CSS Grid container driven by CSS custom properties from the layout service. Data attributes control the active grid variant.

```typescript
import { Component, computed, HostListener, inject, signal } from '@angular/core';
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
      [attr.data-toolbar]="layout.toolbarVisible() ? 'visible' : 'hidden'"
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

      /* Default: sidebar + main, addons at bottom */
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

    /* Addons on the right */
    .prism-shell[data-orientation="right"][data-addons="visible"] {
      grid-template-columns: var(--sw) 4px 1fr 4px var(--pw);
      grid-template-rows: var(--prism-header-height) 1fr;
      grid-template-areas:
        "header  header  header  header  header"
        "sidebar shdrag  main    phdrag  panel";
    }

    .prism-shell__header  { grid-area: header; }
    .prism-shell__sidebar { grid-area: sidebar; overflow: hidden; min-width: 0; }
    .prism-shell__main    { grid-area: main; display: flex; flex-direction: column; overflow: hidden; min-height: 0; }
    .prism-shell__panel   { grid-area: panel; overflow: hidden; min-height: 0; min-width: 0; }

    .prism-shell__sidebar-handle {
      grid-area: shdrag;
      cursor: col-resize;
      background: transparent;
      transition: background 0.15s;
      z-index: 10;
      &:hover { background: var(--prism-border); }
    }

    .prism-shell__panel-handle {
      grid-area: phdrag;
      background: transparent;
      transition: background 0.15s;
      z-index: 10;
      cursor: row-resize;
      &:hover { background: var(--prism-border); }
    }

    /* panel handle is a col-resize when orientation is right */
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
```

**Step 2: Run tests to verify no regressions**

```bash
npx nx test ng-prism
```
Expected: all existing tests PASS

**Step 3: Commit**

```bash
git add packages/ng-prism/src/app/shell/prism-shell.component.ts
git commit -m "feat: redesign shell with 2-column resizable layout"
```

---

### Task 4: Keyboard Shortcuts + Gear Menu

**Files:**
- Create: `packages/ng-prism/src/app/layout-menu/prism-layout-menu.component.ts`
- Modify: `packages/ng-prism/src/app/shell/prism-shell.component.ts` (add keyboard listener)
- Modify: `packages/ng-prism/src/app/header/prism-header.component.ts` (add gear button)

**Step 1: Create the layout menu component**

```typescript
// packages/ng-prism/src/app/layout-menu/prism-layout-menu.component.ts
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
          <div class="layout-menu__divider"></div>
          <button class="layout-menu__item" (click)="toggle('orientation')">
            <span class="layout-menu__icon">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <rect x="1" y="1" width="10" height="10" rx="1" stroke="currentColor" stroke-width="1.2"/>
                <line x1="6" y1="1" x2="6" y2="11" stroke="currentColor" stroke-width="1.2"/>
              </svg>
            </span>
            <span class="layout-menu__label">
              Panel: {{ layout.addonsOrientation() === 'bottom' ? 'bottom → right' : 'right → bottom' }}
            </span>
            <span class="layout-menu__kbd"><kbd>⌥</kbd><kbd>D</kbd></span>
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

  toggle(target: 'sidebar' | 'toolbar' | 'addons' | 'orientation'): void {
    this.open.set(false);
    switch (target) {
      case 'sidebar': this.layout.toggleSidebar(); break;
      case 'toolbar': this.layout.toggleToolbar(); break;
      case 'addons': this.layout.toggleAddons(); break;
      case 'orientation': this.layout.toggleOrientation(); break;
    }
  }
}
```

**Step 2: Add keyboard shortcuts to the shell**

Add `@HostListener` to `PrismShellComponent`:

```typescript
// Add to imports:
import { HostListener } from '@angular/core';

// Add inside the class:
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
```

**Step 3: Add gear button to the header**

In `PrismHeaderComponent`:
- Import `PrismLayoutMenuComponent`
- Add `<prism-layout-menu />` to the template before the theme toggle

**Step 4: Run all tests**

```bash
npx nx test ng-prism
```
Expected: all tests PASS

**Step 5: Commit**

```bash
git add packages/ng-prism/src/app/layout-menu/prism-layout-menu.component.ts \
        packages/ng-prism/src/app/shell/prism-shell.component.ts \
        packages/ng-prism/src/app/header/prism-header.component.ts
git commit -m "feat: add gear menu with panel toggles and keyboard shortcuts (⌥S/T/A/D)"
```

---

## Phase 3 — Visual Redesign

### Task 5: Header Redesign

**Files:**
- Modify: `packages/ng-prism/src/app/header/prism-header.component.ts`

**Step 1: Rewrite header styles and add SVG theme-toggle icons**

Key changes:
- `font-family: var(--prism-font-sans)` everywhere
- Theme toggle: SVG sun/moon icons instead of emoji
- Search input: better focus ring using `--prism-primary-from`
- Add `⌘K` hint text inside search

```typescript
// In template, replace the theme-toggle button content:
<button class="prism-header__theme-toggle" (click)="themeService.toggle()" [title]="themeService.isDark() ? 'Light mode' : 'Dark mode'">
  @if (themeService.isDark()) {
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
      <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  } @else {
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
    </svg>
  }
</button>
```

Updated styles — key changes vs current:
- Remove `--prism-font-family` references → use `--prism-font-sans`
- Search: `⌘K` label inside input wrapper
- Header background: `var(--prism-void)` instead of color-mix blur

**Step 2: Commit**

```bash
git add packages/ng-prism/src/app/header/prism-header.component.ts
git commit -m "feat: header — SVG theme toggle, font-sans, search ⌘K hint"
```

---

### Task 6: Sidebar Redesign

**Files:**
- Modify: `packages/ng-prism/src/app/sidebar/prism-sidebar.component.ts`

**Step 1: Rewrite sidebar styles**

Key changes:
- Same background as shell: `var(--prism-bg)` (no special sidebar-bg used)
- Active item: left 3px gradient bar + subtle tint — NOT full gradient background
- Hover: lighter violet tint
- Category titles: keep uppercase caps style
- Scrollbar styling

```css
.prism-sidebar {
  background: var(--prism-bg);
  border-right: 1px solid var(--prism-border);
  overflow-y: auto;
  overflow-x: hidden;
  padding: 8px 0;
  height: 100%;
}

.prism-sidebar__item {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 6px 14px;
  font-size: 13px;
  font-family: var(--prism-font-sans);
  border: none;
  background: none;
  color: var(--prism-text-muted);
  cursor: pointer;
  border-left: 3px solid transparent;
  text-align: left;
  transition: background 0.1s, color 0.1s, border-color 0.1s;
}

.prism-sidebar__item:hover {
  background: color-mix(in srgb, var(--prism-primary) 6%, transparent);
  color: var(--prism-text-2);
}

.prism-sidebar__item--active {
  border-left-color: var(--prism-primary);
  background: color-mix(in srgb, var(--prism-primary) 10%, transparent);
  color: var(--prism-text);
  font-weight: 500;
}
.prism-sidebar__item--active:hover {
  background: color-mix(in srgb, var(--prism-primary) 12%, transparent);
}
```

**Step 2: Commit**

```bash
git add packages/ng-prism/src/app/sidebar/prism-sidebar.component.ts
git commit -m "feat: sidebar — left accent active state, unified bg, cleaner hover"
```

---

### Task 7: Component Header Redesign

**Files:**
- Modify: `packages/ng-prism/src/app/component-header/prism-component-header.component.ts`

**Step 1: Rewrite with left gradient accent + font hierarchy**

```css
.prism-component-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--prism-border);
  border-left: 3px solid;
  border-image: linear-gradient(180deg, var(--prism-primary-from), var(--prism-primary-to)) 1;
  background: var(--prism-bg-surface);
}

.prism-component-header__title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--prism-text);
}

.prism-component-header__description {
  margin: 4px 0 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--prism-text-2);
}

.prism-component-header__tag {
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 500;
  border-radius: var(--prism-radius-xs);
  background: color-mix(in srgb, var(--prism-primary) 12%, transparent);
  color: var(--prism-primary);
  border: 1px solid color-mix(in srgb, var(--prism-primary) 20%, transparent);
  letter-spacing: 0.02em;
}
```

**Step 2: Commit**

```bash
git add packages/ng-prism/src/app/component-header/prism-component-header.component.ts
git commit -m "feat: component header — left gradient accent bar, refined typography"
```

---

### Task 8: Renderer / Canvas Redesign

**Files:**
- Modify: `packages/ng-prism/src/app/renderer/prism-renderer.component.ts`

**Step 1: Add dot-grid canvas pattern + centered content**

The canvas background gets a subtle dot grid via CSS `radial-gradient`:

```css
.prism-renderer__canvas {
  flex: 1;
  padding: 48px 40px;
  overflow: auto;
  background-color: var(--prism-bg-surface);
  background-image: radial-gradient(
    circle,
    color-mix(in srgb, var(--prism-primary) 15%, transparent) 1px,
    transparent 1px
  );
  background-size: 20px 20px;
  display: flex;
  align-items: flex-start;
  justify-content: center;
}
```

Variant tabs: keep gradient underline but use `--prism-font-sans`, slightly more padding.

**Step 2: Commit**

```bash
git add packages/ng-prism/src/app/renderer/prism-renderer.component.ts
git commit -m "feat: canvas — dot-grid pattern, centered preview, refined variant tabs"
```

---

### Task 9: Panel Host Redesign

**Files:**
- Modify: `packages/ng-prism/src/app/panels/panel-host/prism-panel-host.component.ts`

**Step 1: Refine panel host styles**

Key changes:
- `background: var(--prism-bg-elevated)` (slightly lifted from canvas)
- Tab row: slightly more padding, `--prism-font-sans`
- Gradient underline stays (signature preserved)
- Panel content: `overflow: auto; height: 100%`

**Step 2: Commit**

```bash
git add packages/ng-prism/src/app/panels/panel-host/prism-panel-host.component.ts
git commit -m "feat: panel host — elevated bg, refined tab row"
```

---

### Task 10: Controls Redesign

**Files:**
- Modify: `packages/ng-prism/src/app/panels/controls/prism-controls-panel.component.ts`
- Modify: `packages/ng-prism/src/app/controls/boolean-control.component.ts`
- Modify: `packages/ng-prism/src/app/controls/string-control.component.ts`
- Modify: `packages/ng-prism/src/app/controls/number-control.component.ts`
- Modify: `packages/ng-prism/src/app/controls/union-control.component.ts`

**Step 1: Redesign controls-panel layout**

Change from vertical stacked layout to a table-style rows: label on left, control on right.

```css
.prism-controls-panel {
  padding: 8px 0;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  height: 100%;
}

.prism-controls-panel__row {
  display: grid;
  grid-template-columns: 160px 1fr;
  align-items: center;
  min-height: 36px;
  padding: 0 16px;
  border-bottom: 1px solid var(--prism-border);
  gap: 12px;
}
.prism-controls-panel__row:last-child { border-bottom: none; }
```

Each control component must:
- Accept `label` and render it in a `.control__label` on the LEFT (not above)
- Actually, the label rendering moves to the parent `controls-panel__row` — each control only renders the INPUT part

**Alternative simpler approach:** Keep label inside each control component but align them horizontally.

Redesign each control with `display: contents` or `display: flex; flex-direction: row` to fit into the grid row.

**Step 2: Replace native checkbox with custom toggle in BooleanControlComponent**

```typescript
template: `
  <div class="prism-boolean-control">
    <span class="prism-boolean-control__label">{{ label() }}</span>
    <button
      class="prism-boolean-control__toggle"
      [class.prism-boolean-control__toggle--on]="value()"
      (click)="valueChange.emit(!value())"
      role="switch"
      [attr.aria-checked]="value()"
    >
      <span class="prism-boolean-control__thumb"></span>
    </button>
  </div>
`,
styles: `
  .prism-boolean-control {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
  }
  .prism-boolean-control__label {
    font-size: 13px;
    font-family: var(--prism-font-sans);
    color: var(--prism-text-2);
    font-weight: 500;
  }
  .prism-boolean-control__toggle {
    position: relative;
    width: 36px;
    height: 20px;
    border-radius: 10px;
    border: none;
    background: var(--prism-bg-surface);
    border: 1px solid var(--prism-border-strong);
    cursor: pointer;
    transition: background 0.2s, border-color 0.2s;
    padding: 0;
    flex-shrink: 0;
  }
  .prism-boolean-control__toggle--on {
    background: var(--prism-primary);
    border-color: var(--prism-primary);
  }
  .prism-boolean-control__thumb {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: var(--prism-text-ghost);
    transition: transform 0.2s, background 0.2s;
  }
  .prism-boolean-control__toggle--on .prism-boolean-control__thumb {
    transform: translateX(16px);
    background: white;
  }
`
```

**Step 3: Commit**

```bash
git add packages/ng-prism/src/app/panels/controls/ \
        packages/ng-prism/src/app/controls/
git commit -m "feat: controls — table layout, custom boolean toggle switch"
```

---

## Phase 4 — Finalize

### Task 11: Full test suite + exports

**Step 1: Export PrismLayoutService from app index**

```typescript
// packages/ng-prism/src/app/index.ts — add:
export { PrismLayoutService } from './services/prism-layout.service.js';
```

**Step 2: Run full test suite**

```bash
npx nx test ng-prism
```
Expected: all tests PASS

**Step 3: Build**

```bash
npx nx build ng-prism
```
Expected: clean build

**Step 4: Final commit**

```bash
git add packages/ng-prism/src/app/index.ts
git commit -m "chore: export PrismLayoutService, verify full test suite"
```

---

## Summary

| Task | Files Changed | Tests |
|------|--------------|-------|
| 1. Tokens | `prism-default-theme.ts` | build check |
| 2. LayoutService | new `prism-layout.service.ts` + spec | 12 unit tests |
| 3. Shell | `prism-shell.component.ts` | existing tests |
| 4. Gear Menu + Shortcuts | new `prism-layout-menu.component.ts`, shell, header | — |
| 5. Header | `prism-header.component.ts` | — |
| 6. Sidebar | `prism-sidebar.component.ts` | — |
| 7. Component Header | `prism-component-header.component.ts` | — |
| 8. Canvas | `prism-renderer.component.ts` | — |
| 9. Panel Host | `prism-panel-host.component.ts` | — |
| 10. Controls | 5 control components | — |
| 11. Finalize | `app/index.ts` | full suite |
