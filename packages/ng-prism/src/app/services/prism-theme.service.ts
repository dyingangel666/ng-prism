import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'ng-prism-theme';

@Injectable({ providedIn: 'root' })
export class PrismThemeService {
  readonly isDark = signal(true);

  constructor() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light') this.isDark.set(false);
    else if (stored === 'dark') this.isDark.set(true);
  }

  toggle(): void {
    this.isDark.update((v) => !v);
    localStorage.setItem(STORAGE_KEY, this.isDark() ? 'dark' : 'light');
  }
}
