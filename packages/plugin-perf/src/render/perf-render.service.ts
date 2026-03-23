import { signal, computed } from '@angular/core';

let instance: PerfRenderService | null = null;

export class PerfRenderService {
  static getInstance(): PerfRenderService {
    if (!instance) instance = new PerfRenderService();
    return instance;
  }

  readonly isRecording = signal(false);
  readonly initialRender = signal<number | null>(null);
  readonly rerenders = signal<number[]>([]);
  readonly cdRunCount = signal(0);

  private observer: PerformanceObserver | null = null;
  private bufferSize = 50;

  readonly avgRerender = computed(() => {
    const samples = this.rerenders();
    if (samples.length === 0) return 0;
    return samples.reduce((a, b) => a + b, 0) / samples.length;
  });

  readonly p95Rerender = computed(() => {
    const samples = this.rerenders();
    if (samples.length === 0) return 0;
    const sorted = [...samples].sort((a, b) => a - b);
    const idx = Math.ceil(sorted.length * 0.95) - 1;
    return sorted[idx];
  });

  readonly maxRerender = computed(() => {
    const samples = this.rerenders();
    if (samples.length === 0) return 0;
    return Math.max(...samples);
  });

  readonly lastRerender = computed(() => {
    const samples = this.rerenders();
    return samples.length > 0 ? samples[samples.length - 1] : null;
  });

  readonly sampleCount = computed(() => this.rerenders().length);

  configure(bufferSize: number): void {
    this.bufferSize = bufferSize;
  }

  startRecording(): void {
    if (this.isRecording()) return;
    this.isRecording.set(true);

    this.observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'prism:render') {
          this.initialRender.set(entry.duration);
        } else if (entry.name === 'prism:rerender') {
          this.cdRunCount.update((c) => c + 1);
          this.rerenders.update((arr) => {
            const next = [...arr, entry.duration];
            return next.length > this.bufferSize ? next.slice(-this.bufferSize) : next;
          });
        }
      }
    });

    this.observer.observe({ type: 'measure', buffered: true });
  }

  stopRecording(): void {
    this.isRecording.set(false);
    this.observer?.disconnect();
    this.observer = null;
  }

  clear(): void {
    this.initialRender.set(null);
    this.rerenders.set([]);
    this.cdRunCount.set(0);
  }
}
