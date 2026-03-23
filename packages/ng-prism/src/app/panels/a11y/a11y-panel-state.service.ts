import { Injectable, signal } from '@angular/core';

export type A11ySubTab = 'violations' | 'keyboard' | 'tree' | 'sr';

@Injectable({ providedIn: 'root' })
export class A11yPanelStateService {
  readonly activeTab = signal<A11ySubTab>('violations');
}
