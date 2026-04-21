import { Injectable, signal } from '@angular/core';
import type { BoxModelData } from './box-model.types.js';

@Injectable()
export class BoxModelStateService {
  readonly hoveredBoxModel = signal<BoxModelData | null>(null);
}
