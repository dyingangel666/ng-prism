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
