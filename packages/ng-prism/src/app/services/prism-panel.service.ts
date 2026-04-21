import { EnvironmentInjector, Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class PrismPanelService {
  readonly activePanelId = signal<string>('controls');
  readonly activeViewId = signal<string>('renderer');
  readonly activePanelInjector = signal<EnvironmentInjector | null>(null);
}
