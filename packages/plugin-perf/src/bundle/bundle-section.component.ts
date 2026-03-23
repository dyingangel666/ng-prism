import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { BundleMetrics } from '../perf.types.js';

@Component({
  selector: 'perf-bundle-section',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (metrics(); as m) {
      <div class="prism-perf-bundle-hero">
        <div class="prism-perf-bundle-metric">
          <div class="prism-perf-label">Source Size</div>
          <div class="prism-perf-bundle-value">{{ formatKb(m.sourceSize) }}<span class="prism-perf-bundle-unit">KB</span></div>
          <div class="prism-perf-sub">{{ formatBytes(m.sourceSize) }} bytes</div>
        </div>
        <div class="prism-perf-bundle-metric">
          <div class="prism-perf-label">Gzip Estimate</div>
          <div class="prism-perf-bundle-value">{{ formatKb(m.gzipEstimate) }}<span class="prism-perf-bundle-unit">KB</span></div>
          <div class="prism-perf-sub">~{{ gzipPercent() }}% of source</div>
        </div>
        <div class="prism-perf-bundle-metric">
          <div class="prism-perf-label">Direct Imports</div>
          <div class="prism-perf-bundle-value">{{ m.directImports }}</div>
          <div class="prism-perf-sub">top-level only</div>
        </div>
        <div class="prism-perf-bundle-metric">
          <div class="prism-perf-label">Tree Depth</div>
          <div class="prism-perf-bundle-value">{{ m.treeDepth }}<span class="prism-perf-bundle-unit">/ 10</span></div>
          <div class="prism-perf-sub">import levels</div>
        </div>
      </div>

      <div class="prism-perf-bundle-section">
        <div class="prism-perf-label">Size Breakdown</div>
        <div class="prism-perf-size-bars">
          <div class="prism-perf-size-bar-row">
            <span class="prism-perf-size-bar-label">source</span>
            <div class="prism-perf-size-bar-track">
              <div class="prism-perf-size-bar-fill" [style.width.%]="sourceBarPercent()" style="background: linear-gradient(90deg, #a78bfa, #818cf8)"></div>
            </div>
            <span class="prism-perf-size-bar-val" style="color:#a78bfa">{{ formatKb(m.sourceSize) }} KB</span>
          </div>
          <div class="prism-perf-size-bar-row">
            <span class="prism-perf-size-bar-label">gzip est.</span>
            <div class="prism-perf-size-bar-track">
              <div class="prism-perf-size-bar-fill" [style.width.%]="gzipBarPercent()" style="background: rgba(167,139,250,0.45)"></div>
            </div>
            <span class="prism-perf-size-bar-val" style="color:#8476a2">{{ formatKb(m.gzipEstimate) }} KB</span>
          </div>
        </div>
        <div class="prism-perf-threshold-legend">
          <span>Thresholds: <span style="color:var(--perf-warn, #fbbf24)">warn &ge; {{ warnKb() }} KB</span> · <span style="color:var(--perf-crit, #f87171)">crit &ge; {{ critKb() }} KB</span></span>
        </div>
      </div>

      <div class="prism-perf-bundle-section" style="border-bottom:none">
        <div class="prism-perf-label">Import Tree Depth</div>
        <div class="prism-perf-depth-gauge">
          <span class="prism-perf-depth-label">depth</span>
          <div class="prism-perf-depth-steps">
            @for (step of depthSteps(); track step.index) {
              <div class="prism-perf-depth-step" [class.filled]="step.filled" [class.deep]="step.deep"></div>
            }
          </div>
          <span class="prism-perf-depth-val" [style.color]="m.treeDepth >= 4 ? 'var(--perf-warn, #fbbf24)' : 'var(--prism-primary, #a78bfa)'">{{ m.treeDepth }} / 10</span>
        </div>

        <div style="margin-top:14px">
          <div class="prism-perf-label">Direct Imports ({{ m.directImports }})</div>
          <div class="prism-perf-import-list">
            @for (imp of visibleImports(); track imp) {
              <span class="prism-perf-import-chip" [class]="chipClass(imp)">{{ imp }}</span>
            }
            @if (hiddenImportCount() > 0) {
              <span class="prism-perf-import-chip">+{{ hiddenImportCount() }} more</span>
            }
          </div>
        </div>
      </div>
    } @else {
      <div class="prism-perf-empty">
        <div class="prism-perf-empty-icon">&#128230;</div>
        <div class="prism-perf-empty-text">No bundle data available</div>
        <div class="prism-perf-empty-hint">Bundle metrics are collected at build time</div>
      </div>
    }
  `,
  styles: `
    .prism-perf-bundle-hero {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      border-bottom: 1px solid var(--prism-border, rgba(255,255,255,0.08));
    }
    .prism-perf-bundle-metric {
      padding: 14px 16px;
      border-right: 1px solid var(--prism-border, rgba(255,255,255,0.08));
    }
    .prism-perf-bundle-metric:last-child { border-right: none; }
    .prism-perf-bundle-value {
      font-size: 22px;
      font-family: var(--prism-font-mono, monospace);
      font-weight: 600;
      color: var(--prism-text, #ede9f8);
      line-height: 1;
      margin-top: 5px;
    }
    .prism-perf-bundle-unit {
      font-size: 11px;
      font-weight: 400;
      color: var(--prism-text-muted, #8476a2);
      margin-left: 3px;
    }
    .prism-perf-label {
      font-size: 9px;
      font-weight: 600;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--prism-text-ghost, #6a5d87);
      margin-bottom: 5px;
    }
    .prism-perf-sub {
      font-size: 10px;
      color: var(--prism-text-ghost, #6a5d87);
      margin-top: 3px;
      font-family: var(--prism-font-mono, monospace);
    }
    .prism-perf-bundle-section {
      padding: 14px 16px;
      border-bottom: 1px solid var(--prism-border, rgba(255,255,255,0.08));
    }
    .prism-perf-size-bars {
      display: flex;
      flex-direction: column;
      gap: 7px;
      margin-top: 10px;
    }
    .prism-perf-size-bar-row {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .prism-perf-size-bar-label {
      font-size: 11px;
      color: var(--prism-text-muted, #8476a2);
      width: 90px;
      flex-shrink: 0;
      font-family: var(--prism-font-mono, monospace);
    }
    .prism-perf-size-bar-track {
      flex: 1;
      height: 6px;
      background: rgba(255,255,255,0.05);
      border-radius: 3px;
      overflow: hidden;
    }
    .prism-perf-size-bar-fill {
      height: 100%;
      border-radius: 3px;
    }
    .prism-perf-size-bar-val {
      font-size: 11px;
      font-family: var(--prism-font-mono, monospace);
      color: var(--prism-text-2, #b0a6c8);
      width: 58px;
      text-align: right;
      flex-shrink: 0;
    }
    .prism-perf-threshold-legend {
      margin-top: 10px;
      font-size: 10px;
      font-family: var(--prism-font-mono, monospace);
      color: var(--prism-text-ghost, #6a5d87);
    }
    .prism-perf-depth-gauge {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-top: 10px;
    }
    .prism-perf-depth-label {
      font-size: 11px;
      color: var(--prism-text-muted, #8476a2);
      width: 90px;
      flex-shrink: 0;
      font-family: var(--prism-font-mono, monospace);
    }
    .prism-perf-depth-steps {
      display: flex;
      gap: 3px;
      flex: 1;
    }
    .prism-perf-depth-step {
      flex: 1;
      height: 6px;
      border-radius: 2px;
      background: rgba(255,255,255,0.05);
    }
    .prism-perf-depth-step.filled {
      background: var(--prism-primary, #a78bfa);
      opacity: 0.8;
    }
    .prism-perf-depth-step.deep {
      background: var(--perf-warn, #fbbf24);
      opacity: 0.5;
    }
    .prism-perf-depth-val {
      font-size: 11px;
      font-family: var(--prism-font-mono, monospace);
      width: 58px;
      text-align: right;
      flex-shrink: 0;
    }
    .prism-perf-import-list {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
      margin-top: 8px;
    }
    .prism-perf-import-chip {
      padding: 2px 8px;
      border-radius: 3px;
      background: rgba(255,255,255,0.04);
      border: 1px solid var(--prism-border, rgba(255,255,255,0.08));
      font-size: 10px;
      font-family: var(--prism-font-mono, monospace);
      color: var(--prism-text-muted, #8476a2);
    }
    .prism-perf-import-chip.angular {
      color: var(--prism-primary, #a78bfa);
      border-color: color-mix(in srgb, var(--prism-primary, #a78bfa) 25%, transparent);
      background: color-mix(in srgb, var(--prism-primary, #a78bfa) 8%, transparent);
    }
    .prism-perf-import-chip.rxjs {
      color: #67e8f9;
      border-color: color-mix(in srgb, #67e8f9 25%, transparent);
      background: color-mix(in srgb, #67e8f9 8%, transparent);
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

  readonly depthSteps = computed(() => {
    const m = this.metrics();
    const depth = m?.treeDepth ?? 0;
    return Array.from({ length: 10 }, (_, i) => ({
      index: i,
      filled: i < depth,
      deep: i >= 4 && i < depth,
    }));
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
    if (imp.startsWith('rxjs')) return 'rxjs';
    return '';
  }
}
