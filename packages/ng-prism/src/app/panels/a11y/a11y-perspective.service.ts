import { Injectable, signal } from '@angular/core';

export type A11yPerspectiveMode = 'visual' | 'screen-reader';

@Injectable({ providedIn: 'root' })
export class A11yPerspectiveService {
  readonly mode = signal<A11yPerspectiveMode>('visual');
}
