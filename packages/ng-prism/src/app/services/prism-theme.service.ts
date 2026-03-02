import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class PrismThemeService {
  readonly isDark = signal(true);

  toggle(): void {
    this.isDark.update((v) => !v);
  }
}
