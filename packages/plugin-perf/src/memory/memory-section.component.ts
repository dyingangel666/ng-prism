import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { PerfMemoryService } from './perf-memory.service.js';

@Component({
  selector: 'perf-memory-section',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (memoryService(); as svc) {
      @if (!svc.available()) {
        <div class="prism-perf-empty">
          <div class="prism-perf-empty-icon">&#129504;</div>
          <div class="prism-perf-empty-text">Memory API not available</div>
          <div class="prism-perf-empty-hint">performance.memory is Chrome-only (non-standard)</div>
        </div>
      } @else if (svc.snapshots().length > 0) {
        <div class="prism-perf-memory-hero">
          <div class="prism-perf-memory-metric">
            <div class="prism-perf-label">Before Create</div>
            <div class="prism-perf-memory-value">{{ formatMb(svc.beforeCreate()?.bytes) }}<span class="prism-perf-memory-unit"> MB</span></div>
            <div class="prism-perf-sub">baseline heap</div>
          </div>
          <div class="prism-perf-memory-metric">
            <div class="prism-perf-label">After Create</div>
            <div class="prism-perf-memory-value" [class.delta-pos]="svc.delta() !== null && svc.delta()! > 0">
              {{ formatMb(svc.afterCreate()?.bytes) }}<span class="prism-perf-memory-unit"> MB</span>
            </div>
            <div class="prism-perf-sub">{{ deltaText() }}</div>
          </div>
          <div class="prism-perf-memory-metric">
            <div class="prism-perf-label">After Destroy</div>
            <div class="prism-perf-memory-value" [class]="destroyClass()">
              {{ formatMb(svc.afterDestroy()?.bytes) }}<span class="prism-perf-memory-unit"> MB</span>
            </div>
            <div class="prism-perf-sub">{{ residualText() }}</div>
          </div>
        </div>

        @if (svc.beforeCreate() && svc.afterCreate()) {
          <div class="prism-perf-memory-bar-section">
            <div class="prism-perf-label">Heap Comparison</div>
            <div class="prism-perf-memory-bars">
              <div class="prism-perf-memory-bar-row">
                <span class="prism-perf-memory-bar-label">before</span>
                <div class="prism-perf-memory-bar-track">
                  <div class="prism-perf-memory-bar-fill" [style.width.%]="barPercent(svc.beforeCreate()?.bytes)" style="background:rgba(167,139,250,0.4)"></div>
                </div>
                <span class="prism-perf-memory-bar-val">{{ formatMb(svc.beforeCreate()?.bytes) }} MB</span>
              </div>
              <div class="prism-perf-memory-bar-row">
                <span class="prism-perf-memory-bar-label">after create</span>
                <div class="prism-perf-memory-bar-track">
                  <div class="prism-perf-memory-bar-fill" [style.width.%]="barPercent(svc.afterCreate()?.bytes)" style="background:linear-gradient(90deg,rgba(167,139,250,0.4),rgba(251,191,36,0.6))"></div>
                </div>
                <span class="prism-perf-memory-bar-val" style="color:var(--perf-warn, #fbbf24)">{{ formatMb(svc.afterCreate()?.bytes) }} MB</span>
              </div>
              @if (svc.afterDestroy()) {
                <div class="prism-perf-memory-bar-row">
                  <span class="prism-perf-memory-bar-label">after destroy</span>
                  <div class="prism-perf-memory-bar-track">
                    <div class="prism-perf-memory-bar-fill" [style.width.%]="barPercent(svc.afterDestroy()?.bytes)" style="background:rgba(74,222,128,0.4)"></div>
                  </div>
                  <span class="prism-perf-memory-bar-val" style="color:var(--perf-ok, #4ade80)">{{ formatMb(svc.afterDestroy()?.bytes) }} MB</span>
                </div>
              }
            </div>
          </div>
        }

        <div class="prism-perf-memory-leak-section">
          <div class="prism-perf-label">Leak Analysis</div>
          @if (svc.leakStatus() === 'ok') {
            <div class="prism-perf-leak-badge ok">
              <div class="prism-perf-leak-dot"></div>
              No significant leak detected — residual {{ formatMb(svc.residual()! + (svc.beforeCreate()?.bytes ?? 0)) }} MB within threshold
            </div>
          } @else if (svc.leakStatus() === 'warn') {
            <div class="prism-perf-leak-badge warn">
              <div class="prism-perf-leak-dot"></div>
              Possible leak — +{{ formatMb(svc.residual()!) }} MB not reclaimed after destroy
            </div>
          }
          <div class="prism-perf-memory-disclaimer">
            performance.memory is Chrome-only (non-standard). Not available in other browsers.
          </div>
        </div>
      } @else {
        <div class="prism-perf-empty">
          <div class="prism-perf-empty-icon">&#129504;</div>
          <div class="prism-perf-empty-text">No memory snapshots yet</div>
          <div class="prism-perf-empty-hint">Click Snapshot to capture heap data</div>
        </div>
      }
    }
  `,
  styles: `
    .prism-perf-memory-hero {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      border-bottom: 1px solid var(--prism-border, rgba(255,255,255,0.08));
    }
    .prism-perf-memory-metric {
      padding: 14px 16px;
      border-right: 1px solid var(--prism-border, rgba(255,255,255,0.08));
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .prism-perf-memory-metric:last-child { border-right: none; }
    .prism-perf-memory-value {
      font-size: 20px;
      font-family: var(--prism-font-mono, monospace);
      font-weight: 600;
      color: var(--prism-text, #ede9f8);
      line-height: 1.1;
    }
    .prism-perf-memory-value.delta-pos { color: var(--perf-warn, #fbbf24); }
    .prism-perf-memory-value.delta-ok { color: var(--perf-ok, #4ade80); }
    .prism-perf-memory-value.delta-neg { color: var(--perf-crit, #f87171); }
    .prism-perf-memory-unit { font-size: 11px; font-weight: 400; color: var(--prism-text-muted, #8476a2); }
    .prism-perf-label {
      font-size: 9px;
      font-weight: 600;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--prism-text-ghost, #6a5d87);
    }
    .prism-perf-sub {
      font-size: 10px;
      color: var(--prism-text-ghost, #6a5d87);
      font-family: var(--prism-font-mono, monospace);
    }
    .prism-perf-memory-bar-section {
      padding: 14px 16px;
      border-bottom: 1px solid var(--prism-border, rgba(255,255,255,0.08));
    }
    .prism-perf-memory-bars {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 12px;
    }
    .prism-perf-memory-bar-row {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .prism-perf-memory-bar-label {
      font-size: 10px;
      color: var(--prism-text-muted, #8476a2);
      width: 80px;
      flex-shrink: 0;
      font-family: var(--prism-font-mono, monospace);
    }
    .prism-perf-memory-bar-track {
      flex: 1;
      height: 8px;
      background: rgba(255,255,255,0.04);
      border-radius: 4px;
      overflow: hidden;
    }
    .prism-perf-memory-bar-fill {
      height: 100%;
      border-radius: 4px;
    }
    .prism-perf-memory-bar-val {
      font-size: 11px;
      font-family: var(--prism-font-mono, monospace);
      color: var(--prism-text-2, #b0a6c8);
      width: 60px;
      text-align: right;
      flex-shrink: 0;
    }
    .prism-perf-memory-leak-section {
      padding: 14px 16px;
    }
    .prism-perf-leak-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 14px;
      border-radius: 5px;
      font-size: 12px;
      font-weight: 500;
      margin-top: 8px;
    }
    .prism-perf-leak-badge.ok {
      background: color-mix(in srgb, var(--perf-ok, #4ade80) 10%, transparent);
      border: 1px solid color-mix(in srgb, var(--perf-ok, #4ade80) 25%, transparent);
      color: var(--perf-ok, #4ade80);
    }
    .prism-perf-leak-badge.warn {
      background: color-mix(in srgb, var(--perf-warn, #fbbf24) 10%, transparent);
      border: 1px solid color-mix(in srgb, var(--perf-warn, #fbbf24) 25%, transparent);
      color: var(--perf-warn, #fbbf24);
    }
    .prism-perf-leak-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
    }
    .ok .prism-perf-leak-dot { background: var(--perf-ok, #4ade80); }
    .warn .prism-perf-leak-dot { background: var(--perf-warn, #fbbf24); box-shadow: 0 0 6px var(--perf-warn, #fbbf24); }
    .prism-perf-memory-disclaimer {
      margin-top: 10px;
      font-size: 10px;
      color: var(--prism-text-ghost, #6a5d87);
      font-family: var(--prism-font-mono, monospace);
    }
    .prism-perf-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      height: 100%;
      min-height: 180px;
    }
    .prism-perf-empty-icon { font-size: 28px; opacity: 0.2; }
    .prism-perf-empty-text { font-size: 12px; color: var(--prism-text-ghost, #6a5d87); }
    .prism-perf-empty-hint { font-size: 11px; color: var(--prism-text-ghost, #6a5d87); opacity: 0.6; }
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

  readonly destroyClass = computed(() => {
    const status = this.memoryService().leakStatus();
    if (status === 'ok') return 'delta-ok';
    if (status === 'warn') return 'delta-neg';
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
