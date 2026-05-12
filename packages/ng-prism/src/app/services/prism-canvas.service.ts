import { Injectable, signal } from '@angular/core';
import { CANVAS_BGS, type CanvasBg } from '../../shared/canvas-bg.type.js';

export type { CanvasBg };

const STORAGE_KEY = 'ng-prism-canvas';

@Injectable({ providedIn: 'root' })
export class PrismCanvasService {
  readonly bg = signal<CanvasBg>('dots');
  readonly zoom = signal(1);
  readonly guides = signal(false);
  readonly rulers = signal(false);

  constructor() {
    this.loadFromStorage();
  }

  setBg(bg: CanvasBg): void {
    this.bg.set(bg);
    this.save();
  }

  setZoom(z: number): void {
    this.zoom.set(z);
    this.save();
  }

  toggleGuides(): void {
    this.guides.update((v) => !v);
    this.save();
  }

  toggleRulers(): void {
    this.rulers.update((v) => !v);
    this.save();
  }

  private loadFromStorage(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const d = JSON.parse(raw) as Record<string, unknown>;
      if (CANVAS_BGS.includes(d['bg'] as CanvasBg)) {
        this.bg.set(d['bg'] as CanvasBg);
      }
      if (typeof d['zoom'] === 'number') this.zoom.set(d['zoom']);
      if (typeof d['guides'] === 'boolean') this.guides.set(d['guides']);
      if (typeof d['rulers'] === 'boolean') this.rulers.set(d['rulers']);
    } catch {}
  }

  private save(): void {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          bg: this.bg(),
          zoom: this.zoom(),
          guides: this.guides(),
          rulers: this.rulers(),
        })
      );
    } catch {}
  }
}
