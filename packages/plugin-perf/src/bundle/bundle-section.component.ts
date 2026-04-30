import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { BundleMetrics } from '../perf.types.js';

@Component({
  selector: 'perf-bundle-section',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (metrics(); as m) {
      <div class="perf-body perf-body--4col">
        <div class="perf-card">
          <div class="perf-card-head">
            <span class="perf-card-name">Source Size</span>
            <span class="perf-card-status" [class]="sizeStatus()">{{ sizeStatusText() }}</span>
          </div>
          <div class="perf-card-val">{{ formatKb(m.sourceSize) }}<span>kb</span></div>
          <div class="perf-card-sub">{{ formatBytes(m.sourceSize) }} bytes</div>
        </div>
        <div class="perf-card">
          <div class="perf-card-head">
            <span class="perf-card-name">Gzip Estimate</span>
            <span class="perf-card-status" [class]="gzipStatus()">{{ gzipStatusText() }}</span>
          </div>
          <div class="perf-card-val">{{ formatKb(m.gzipEstimate) }}<span>kb</span></div>
          <div class="perf-card-sub">~{{ gzipPercent() }}% of source</div>
        </div>
        <div class="perf-card">
          <div class="perf-card-head">
            <span class="perf-card-name">Direct Imports</span>
          </div>
          <div class="perf-card-val">{{ m.directImports }}</div>
          <div class="perf-card-sub">top-level only</div>
        </div>
        <div class="perf-card">
          <div class="perf-card-head">
            <span class="perf-card-name">Tree Depth</span>
          </div>
          <div class="perf-card-val">{{ m.treeDepth }}<span>/ 10</span></div>
          <div class="perf-card-sub">import levels</div>
        </div>
      </div>

      <div class="perf-detail">
        <div class="perf-card perf-card--block">
          <div class="perf-card-head"><span class="perf-card-name">Size Breakdown</span></div>
          <div class="perf-bars">
            <span class="perf-bar-label">source</span>
            <div class="perf-bar-track"><div class="perf-bar-fill" [style.width.%]="sourceBarPercent()"></div></div>
            <span class="perf-bar-val">{{ formatKb(m.sourceSize) }} KB</span>
            <span class="perf-bar-label">gzip est.</span>
            <div class="perf-bar-track"><div class="perf-bar-fill" [style.width.%]="gzipBarPercent()"></div></div>
            <span class="perf-bar-val">{{ formatKb(m.gzipEstimate) }} KB</span>
          </div>
          <div class="perf-thresholds">Thresholds: <span class="perf-thresholds--warn">warn &ge; {{ warnKb() }} KB</span> &middot; <span class="perf-thresholds--crit">crit &ge; {{ critKb() }} KB</span></div>
        </div>
      </div>

      <div class="perf-detail perf-detail--last">
        <div class="perf-card perf-card--block">
          <div class="perf-card-head"><span class="perf-card-name">Direct Imports ({{ m.directImports }})</span></div>
          <div class="perf-chips">
            @for (imp of visibleImports(); track imp) {
              <span class="perf-chip" [class]="chipClass(imp)">{{ imp }}</span>
            }
            @if (hiddenImportCount() > 0) {
              <span class="perf-chip">+{{ hiddenImportCount() }} more</span>
            }
          </div>
        </div>
      </div>
    } @else {
      <div class="perf-empty">
        <div class="perf-empty-text">No bundle data available</div>
        <div class="perf-empty-hint">Bundle metrics are collected at build time</div>
      </div>
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
    .perf-body--4col { grid-template-columns: repeat(4, 1fr); }

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
    .perf-card-status.good {
      background: color-mix(in srgb, var(--prism-success) 15%, transparent);
      color: var(--prism-success);
    }
    .perf-card-status.warn {
      background: color-mix(in srgb, var(--prism-warn) 15%, transparent);
      color: var(--prism-warn);
    }
    .perf-card-status.crit {
      background: color-mix(in srgb, var(--prism-danger) 15%, transparent);
      color: var(--prism-danger);
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
      grid-template-columns: 80px 1fr auto;
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
    .perf-bar-val { color: var(--prism-primary); }

    .perf-thresholds {
      margin-top: 10px;
      font-size: 11px;
      color: var(--prism-text-muted);
      font-family: 'JetBrains Mono', monospace;
    }
    .perf-thresholds--warn { color: var(--prism-warn); }
    .perf-thresholds--crit { color: var(--prism-danger); }

    .perf-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 10px;
    }
    .perf-chip {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      padding: 4px 10px;
      background: var(--prism-input-bg);
      color: var(--prism-text-2);
      border: 1px solid var(--prism-border);
      border-radius: 5px;
    }
    .perf-chip.angular {
      background: color-mix(in srgb, var(--prism-primary) 10%, transparent);
      color: var(--prism-primary);
      border-color: color-mix(in srgb, var(--prism-primary) 25%, transparent);
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
export class BundleSectionComponent {
  readonly metrics = input<BundleMetrics | null>(null);
  readonly warnKb = input(20);
  readonly critKb = input(50);

  readonly gzipPercent = computed(() => {
    const m = this.metrics();
    if (!m || m.sourceSize === 0) return 0;
    return Math.round((m.gzipEstimate / m.sourceSize) * 100);
  });

  readonly sourceBarPercent = computed(() => {
    const m = this.metrics();
    if (!m) return 0;
    const maxKb = this.critKb() * 1.2;
    return Math.min(100, (m.sourceSize / 1024 / maxKb) * 100);
  });

  readonly gzipBarPercent = computed(() => {
    const m = this.metrics();
    if (!m) return 0;
    const maxKb = this.critKb() * 1.2;
    return Math.min(100, (m.gzipEstimate / 1024 / maxKb) * 100);
  });

  readonly sizeStatus = computed(() => {
    const m = this.metrics();
    if (!m) return '';
    const kb = m.sourceSize / 1024;
    if (kb >= this.critKb()) return 'crit';
    if (kb >= this.warnKb()) return 'warn';
    return 'good';
  });

  readonly sizeStatusText = computed(() => {
    const s = this.sizeStatus();
    if (s === 'good') return 'good';
    if (s === 'warn') return 'warn';
    if (s === 'crit') return 'crit';
    return '';
  });

  readonly gzipStatus = computed(() => {
    const m = this.metrics();
    if (!m) return '';
    const kb = m.gzipEstimate / 1024;
    if (kb >= this.critKb()) return 'crit';
    if (kb >= this.warnKb()) return 'warn';
    return 'good';
  });

  readonly gzipStatusText = computed(() => {
    const s = this.gzipStatus();
    if (s === 'good') return 'good';
    if (s === 'warn') return 'warn';
    if (s === 'crit') return 'crit';
    return '';
  });

  readonly visibleImports = computed(() => {
    const m = this.metrics();
    return m?.importList.slice(0, 10) ?? [];
  });

  readonly hiddenImportCount = computed(() => {
    const m = this.metrics();
    if (!m) return 0;
    return Math.max(0, m.importList.length - 10);
  });

  formatBytes(bytes: number): string {
    return bytes.toLocaleString('en-US');
  }

  formatKb(bytes: number): string {
    const kb = bytes / 1024;
    return kb < 10 ? kb.toFixed(1) : Math.round(kb).toString();
  }

  chipClass(imp: string): string {
    if (imp.startsWith('@angular/')) return 'angular';
    return '';
  }
}
