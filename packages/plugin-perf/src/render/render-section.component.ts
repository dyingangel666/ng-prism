import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { PerfRenderService } from './perf-render.service.js';
import { SparklineComponent } from './sparkline.component.js';

@Component({
  selector: 'perf-render-section',
  standalone: true,
  imports: [SparklineComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (renderService(); as svc) {
      @if (svc.initialRender() !== null || svc.rerenders().length > 0) {
        <div class="prism-perf-render-hero">
          <div class="prism-perf-render-hero-main">
            <div class="prism-perf-label">Initial Render</div>
            <div class="prism-perf-render-hero-value" [class]="initialClass()">
              {{ formatMs(svc.initialRender()) }}<span class="prism-perf-unit">ms</span>
            </div>
          </div>
          <div class="prism-perf-render-stats-grid">
            <div class="prism-perf-render-stat">
              <span class="prism-perf-label">Avg Re-render</span>
              <span class="prism-perf-render-stat-value">{{ formatMs(svc.avgRerender()) }}<span class="prism-perf-unit"> ms</span></span>
              <span class="prism-perf-sub">{{ svc.sampleCount() }} samples</span>
            </div>
            <div class="prism-perf-render-stat">
              <span class="prism-perf-label">Slowest</span>
              <span class="prism-perf-render-stat-value" [style.color]="colorFor(svc.maxRerender())">{{ formatMs(svc.maxRerender()) }}<span class="prism-perf-unit"> ms</span></span>
            </div>
            <div class="prism-perf-render-stat">
              <span class="prism-perf-label">p95</span>
              <span class="prism-perf-render-stat-value">{{ formatMs(svc.p95Rerender()) }}<span class="prism-perf-unit"> ms</span></span>
            </div>
            <div class="prism-perf-render-stat">
              <span class="prism-perf-label">Last Render</span>
              <span class="prism-perf-render-stat-value">{{ formatMs(svc.lastRerender()) }}<span class="prism-perf-unit"> ms</span></span>
            </div>
          </div>
        </div>

        @if (svc.rerenders().length > 1) {
          <div class="prism-perf-sparkline-section">
            <div class="prism-perf-sparkline-header">
              <span class="prism-perf-label">Render Time Trace — last {{ svc.sampleCount() }} samples</span>
              <div class="prism-perf-sparkline-legend">
                avg <span>{{ formatMs(svc.avgRerender()) }} ms</span> · max <span [style.color]="colorFor(svc.maxRerender())">{{ formatMs(svc.maxRerender()) }} ms</span>
              </div>
            </div>
            <perf-sparkline [samples]="svc.rerenders()" [thresholdWarn]="warnMs()" />
          </div>
        }
      } @else {
        <div class="prism-perf-empty">
          <div class="prism-perf-empty-icon">&#9201;</div>
          <div class="prism-perf-empty-text">No profiling data yet</div>
          <div class="prism-perf-empty-hint">Click Profile to start recording render times</div>
        </div>
      }
    }
  `,
  styles: `
    .prism-perf-render-hero {
      display: grid;
      grid-template-columns: 1fr 1fr;
      border-bottom: 1px solid var(--prism-border, rgba(255,255,255,0.08));
    }
    .prism-perf-render-hero-main {
      padding: 16px 20px;
      border-right: 1px solid var(--prism-border, rgba(255,255,255,0.08));
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .prism-perf-render-hero-value {
      font-size: 34px;
      font-family: var(--prism-font-mono, monospace);
      font-weight: 600;
      color: var(--perf-ok, #4ade80);
      line-height: 1;
      letter-spacing: -0.02em;
    }
    .prism-perf-render-hero-value.warn { color: var(--perf-warn, #fbbf24); }
    .prism-perf-render-hero-value.crit { color: var(--perf-crit, #f87171); }
    .prism-perf-render-stats-grid {
      padding: 12px 16px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px 20px;
    }
    .prism-perf-render-stat {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .prism-perf-render-stat-value {
      font-size: 16px;
      font-family: var(--prism-font-mono, monospace);
      font-weight: 600;
      color: var(--prism-text, #ede9f8);
      line-height: 1.1;
    }
    .prism-perf-sparkline-section {
      padding: 12px 16px 14px;
      border-top: 1px solid var(--prism-border, rgba(255,255,255,0.08));
    }
    .prism-perf-sparkline-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 10px;
    }
    .prism-perf-sparkline-legend {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 10px;
      font-family: var(--prism-font-mono, monospace);
      color: var(--prism-text-ghost, #6a5d87);
    }
    .prism-perf-sparkline-legend span {
      color: var(--prism-primary, #a78bfa);
    }
    .prism-perf-label {
      font-size: 9px;
      font-weight: 600;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--prism-text-ghost, #6a5d87);
    }
    .prism-perf-unit {
      font-size: 12px;
      font-weight: 400;
      color: var(--prism-text-muted, #8476a2);
      margin-left: 4px;
    }
    .prism-perf-sub {
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
export class RenderSectionComponent {
  readonly renderService = input.required<PerfRenderService>();
  readonly warnMs = input(5);
  readonly critMs = input(16);

  readonly initialClass = computed(() => {
    const v = this.renderService().initialRender();
    if (v === null) return '';
    if (v >= this.critMs()) return 'crit';
    if (v >= this.warnMs()) return 'warn';
    return '';
  });

  formatMs(value: number | null): string {
    if (value === null) return '—';
    return value < 10 ? value.toFixed(2) : value.toFixed(1);
  }

  colorFor(value: number): string {
    if (value >= this.critMs()) return 'var(--perf-crit, #f87171)';
    if (value >= this.warnMs()) return 'var(--perf-warn, #fbbf24)';
    return 'var(--prism-text, #ede9f8)';
  }
}
