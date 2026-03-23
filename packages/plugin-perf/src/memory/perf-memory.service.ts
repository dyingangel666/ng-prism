import { signal, computed } from '@angular/core';
import type { PrismRendererHooks } from 'ng-prism/plugin';

export interface HeapSnapshot {
  label: string;
  bytes: number;
  timestamp: number;
}

let instance: PerfMemoryService | null = null;

export class PerfMemoryService implements PrismRendererHooks {
  static getInstance(): PerfMemoryService {
    if (!instance) instance = new PerfMemoryService();
    return instance;
  }

  readonly snapshots = signal<HeapSnapshot[]>([]);
  readonly available = computed(() => typeof performance !== 'undefined' && 'memory' in performance);

  private gcDelay = 100;

  readonly beforeCreate = computed(() => this.findSnapshot('before-create'));
  readonly afterCreate = computed(() => this.findSnapshot('after-create'));
  readonly afterDestroy = computed(() => this.findSnapshot('after-destroy'));

  readonly delta = computed(() => {
    const before = this.beforeCreate();
    const after = this.afterCreate();
    if (!before || !after) return null;
    return after.bytes - before.bytes;
  });

  readonly residual = computed(() => {
    const before = this.beforeCreate();
    const destroy = this.afterDestroy();
    if (!before || !destroy) return null;
    return destroy.bytes - before.bytes;
  });

  readonly leakStatus = computed<'ok' | 'warn' | 'unknown'>(() => {
    const residualMb = this.residual();
    if (residualMb === null) return 'unknown';
    return residualMb / (1024 * 1024) >= 0.5 ? 'warn' : 'ok';
  });

  configure(gcDelayMs: number): void {
    this.gcDelay = gcDelayMs;
  }

  onBeforeCreate(_selector: string): void {
    this.takeSnapshot('before-create');
  }

  onAfterCreate(_selector: string): void {
    setTimeout(() => this.takeSnapshot('after-create'), 50);
  }

  onAfterDestroy(_selector: string): void {
    setTimeout(() => this.takeSnapshot('after-destroy'), this.gcDelay);
  }

  takeSnapshot(label: string): void {
    if (!this.available()) return;
    const mem = (performance as unknown as { memory: { usedJSHeapSize: number } }).memory;
    this.snapshots.update((arr) => [
      ...arr.filter((s) => s.label !== label),
      { label, bytes: mem.usedJSHeapSize, timestamp: Date.now() },
    ]);
  }

  clear(): void {
    this.snapshots.set([]);
  }

  private findSnapshot(label: string): HeapSnapshot | null {
    return this.snapshots().find((s) => s.label === label) ?? null;
  }
}
