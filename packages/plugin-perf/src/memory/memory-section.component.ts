import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { PerfMemoryService } from './perf-memory.service.js';

@Component({
  selector: 'perf-memory-section',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (memoryService(); as svc) {
      @if (!svc.available()) {
        <div class="perf-empty">
          <div class="perf-empty-text">Memory API not available</div>
          <div class="perf-empty-hint">performance.memory is Chrome-only (non-standard)</div>
        </div>
      } @else if (svc.snapshots().length > 0) {
        <div class="perf-body">
          <div class="perf-card">
            <div class="perf-card-head"><span class="perf-card-name">Before Create</span></div>
            <div class="perf-card-val">{{ formatMb(svc.beforeCreate()?.bytes) }}<span>MB</span></div>
            <div class="perf-card-sub">baseline heap</div>
          </div>
          <div class="perf-card">
            <div class="perf-card-head">
              <span class="perf-card-name">After Create</span>
              @if (svc.delta() !== null && svc.delta()! > 0) {
              <span class="perf-card-status warn">watch</span>
              }
            </div>
            <div class="perf-card-val" [style.color]="afterCreateColor()">{{ formatMb(svc.afterCreate()?.bytes) }}<span>MB</span></div>
            <div class="perf-card-sub">{{ deltaText() }}</div>
          </div>
          <div class="perf-card">
            <div class="perf-card-head"><span class="perf-card-name">After Destroy</span></div>
            <div class="perf-card-val" [style.color]="destroyColor()">{{ formatMb(svc.afterDestroy()?.bytes) }}<span>MB</span></div>
          </div>
        </div>

        @if (svc.beforeCreate() && svc.afterCreate()) {
        <div class="perf-detail">
          <div class="perf-card perf-card--block">
            <div class="perf-card-head"><span class="perf-card-name">Heap Comparison</span></div>
            <div class="perf-bars">
              <span class="perf-bar-label">before</span>
              <div class="perf-bar-track"><div class="perf-bar-fill" [style.width.%]="barPercent(svc.beforeCreate()?.bytes)"></div></div>
              <span class="perf-bar-val">{{ formatMb(svc.beforeCreate()?.bytes) }} MB</span>
              <span class="perf-bar-label">after create</span>
              <div class="perf-bar-track"><div class="perf-bar-fill perf-bar-fill--warn" [style.width.%]="barPercent(svc.afterCreate()?.bytes)"></div></div>
              <span class="perf-bar-val perf-bar-val--warn">{{ formatMb(svc.afterCreate()?.bytes) }} MB</span>
            </div>
          </div>
        </div>
        }

        <div class="perf-detail perf-detail--last">
          <div class="perf-card perf-card--block">
            <div class="perf-card-head"><span class="perf-card-name">Leak Analysis</span></div>
            @if (svc.leakStatus() === 'ok') {
            <div class="perf-leak-badge perf-leak-badge--ok">
              <span class="perf-leak-dot"></span>
              No significant leak detected
            </div>
            } @else if (svc.leakStatus() === 'warn') {
            <div class="perf-leak-badge perf-leak-badge--warn">
              <span class="perf-leak-dot"></span>
              Possible leak &mdash; +{{ formatMb(svc.residual()!) }} MB not reclaimed
            </div>
            }
            <div class="perf-disclaimer">&#9432; performance.memory is Chrome-only (non-standard). Not available in other browsers.</div>
          </div>
        </div>
      } @else {
        <div class="perf-empty">
          <div class="perf-empty-text">No memory snapshots yet</div>
          <div class="perf-empty-hint">Click Snapshot to capture heap data</div>
        </div>
      }
    }
  `,
  styles: `
    .perf-body {
      padding: 20px 24px;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      align-content: start;
    }

    .perf-card {
      padding: 16px;
      background: var(--prism-bg-surface);
      border: 1px solid var(--prism-border);
      border-radius: 10px;
    }
    .perf-card--block { display: block; }
    .perf-card-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 10px;
    }
    .perf-card-name {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--prism-text-ghost);
      font-weight: 700;
    }
    .perf-card-status {
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 3px;
      font-weight: 700;
      letter-spacing: 0.04em;
    }
    .perf-card-status.warn {
      background: color-mix(in srgb, var(--prism-warn) 15%, transparent);
      color: var(--prism-warn);
    }
    .perf-card-val {
      font-family: 'JetBrains Mono', monospace;
      font-size: 26px;
      font-weight: 700;
      color: var(--prism-text);
      letter-spacing: -0.02em;
      display: flex;
      align-items: baseline;
      gap: 4px;
    }
    .perf-card-val span {
      font-size: 13px;
      color: var(--prism-text-muted);
      font-weight: 500;
    }
    .perf-card-sub {
      font-size: 11px;
      color: var(--prism-text-muted);
      margin-top: 4px;
      font-family: 'JetBrains Mono', monospace;
    }

    .perf-detail { padding: 0 24px 16px; }
    .perf-detail--last { padding-bottom: 20px; }

    .perf-bars {
      display: grid;
      grid-template-columns: 100px 1fr auto;
      gap: 10px;
      align-items: center;
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      margin-top: 8px;
    }
    .perf-bar-label { color: var(--prism-text-muted); }
    .perf-bar-track {
      height: 8px;
      background: var(--prism-input-bg);
      border-radius: 4px;
      overflow: hidden;
    }
    .perf-bar-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--prism-primary-from), var(--prism-primary-to));
      border-radius: 4px;
    }
    .perf-bar-fill--warn {
      background: linear-gradient(90deg, var(--prism-warn), var(--prism-warn));
      opacity: 0.8;
    }
    .perf-bar-val { color: var(--prism-primary); }
    .perf-bar-val--warn { color: var(--prism-warn); }

    .perf-leak-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 14px;
      border-radius: 5px;
      font-size: 12px;
      font-weight: 500;
      margin-top: 8px;
    }
    .perf-leak-badge--ok {
      background: color-mix(in srgb, var(--prism-success) 10%, transparent);
      border: 1px solid color-mix(in srgb, var(--prism-success) 25%, transparent);
      color: var(--prism-success);
    }
    .perf-leak-badge--warn {
      background: color-mix(in srgb, var(--prism-warn) 10%, transparent);
      border: 1px solid color-mix(in srgb, var(--prism-warn) 25%, transparent);
      color: var(--prism-warn);
    }
    .perf-leak-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
    }
    .perf-leak-badge--ok .perf-leak-dot { background: var(--prism-success); }
    .perf-leak-badge--warn .perf-leak-dot {
      background: var(--prism-warn);
      box-shadow: 0 0 6px var(--prism-warn);
    }

    .perf-disclaimer {
      margin-top: 8px;
      font-size: 12px;
      color: var(--prism-text-muted);
      font-family: 'JetBrains Mono', monospace;
    }

    .perf-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      height: 100%;
      min-height: 180px;
    }
    .perf-empty-text { font-size: 12px; color: var(--prism-text-ghost); }
    .perf-empty-hint { font-size: 11px; color: var(--prism-text-ghost); opacity: 0.6; }
  `,
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
