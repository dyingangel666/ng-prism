import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class PrismPanelService {
  readonly activePanelId = signal<string>('controls');
}
