import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import type { PerfMemoryService } from './perf-memory.service.js';

@Component({
  selector: 'perf-memory-section',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './memory-section.component.html',
  styleUrl: './memory-section.component.css',
})
export class MemorySectionComponent {
  readonly memoryService = input.required<PerfMemoryService>();

  private readonly maxBytes = computed(() => {
    const svc = this.memoryService();
    const vals = [
      svc.beforeCreate()?.bytes ?? 0,
      svc.afterCreate()?.bytes ?? 0,
      svc.afterDestroy()?.bytes ?? 0,
    ];
    return Math.max(...vals);
  });

  readonly deltaText = computed(() => {
    const d = this.memoryService().delta();
    if (d === null) return '';
    return `+${this.formatMb(d)} MB delta`;
  });

  readonly residualText = computed(() => {
    const r = this.memoryService().residual();
    if (r === null) return '';
    return `+${this.formatMb(r)} MB residual`;
  });

  readonly afterCreateColor = computed(() => {
    const d = this.memoryService().delta();
    if (d !== null && d > 0) return 'var(--prism-warn)';
    return '';
  });

  readonly destroyColor = computed(() => {
    const svc = this.memoryService();
    if (!svc.afterDestroy()) return 'var(--prism-text-ghost)';
    const status = svc.leakStatus();
    if (status === 'ok') return 'var(--prism-success)';
    if (status === 'warn') return 'var(--prism-danger)';
    return '';
  });

  barPercent(bytes: number | undefined): number {
    if (!bytes || this.maxBytes() === 0) return 0;
    return (bytes / this.maxBytes()) * 100;
  }

  formatMb(bytes: number | null | undefined): string {
    if (bytes === null || bytes === undefined) return '—';
    return (bytes / (1024 * 1024)).toFixed(1);
  }
}
