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
        <div class="perf-body">
          <div class="perf-card">
            <div class="perf-card-head"><span class="perf-card-name">Initial Render</span></div>
            <div class="perf-card-val" [style.color]="colorFor(svc.initialRender())">{{ formatMs(svc.initialRender()) }}<span>ms</span></div>
          </div>
          <div class="perf-card">
            <div class="perf-card-head"><span class="perf-card-name">Avg Re-Render</span></div>
            <div class="perf-card-val">{{ formatMs(svc.avgRerender()) }}<span>ms</span></div>
            <div class="perf-card-sub">{{ svc.sampleCount() }} samples</div>
          </div>
          <div class="perf-card">
            <div class="perf-card-head"><span class="perf-card-name">Slowest</span></div>
            <div class="perf-card-val">{{ formatMs(svc.maxRerender()) }}<span>ms</span></div>
          </div>
          <div class="perf-card">
            <div class="perf-card-head"><span class="perf-card-name">P95</span></div>
            <div class="perf-card-val">{{ formatMs(svc.p95Rerender()) }}<span>ms</span></div>
          </div>
          <div class="perf-card">
            <div class="perf-card-head"><span class="perf-card-name">Last Render</span></div>
            <div class="perf-card-val">{{ formatMs(svc.lastRerender()) }}<span>ms</span></div>
          </div>
        </div>

        @if (svc.rerenders().length > 1) {
        <div class="perf-detail">
          <div class="perf-card perf-card--block">
            <div class="perf-card-head">
              <span class="perf-card-name">Render Time Trace &mdash; Last {{ svc.sampleCount() }} Samples</span>
              <span class="perf-sparkline-legend">avg <span class="perf-sparkline-hl">{{ formatMs(svc.avgRerender()) }} ms</span> &middot; max <span class="perf-sparkline-hl">{{ formatMs(svc.maxRerender()) }} ms</span></span>
            </div>
            <div class="perf-sparkline-wrap">
              <perf-sparkline [samples]="svc.rerenders()" [thresholdWarn]="warnMs()" [height]="80" />
            </div>
          </div>
        </div>
        }
      } @else {
        <div class="perf-empty">
          <div class="perf-empty-text">No profiling data yet</div>
          <div class="perf-empty-hint">Click Profile to start recording render times</div>
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

    .perf-detail { padding: 0 24px 20px; }

    .perf-sparkline-legend {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      color: var(--prism-text-muted);
    }
    .perf-sparkline-hl { color: var(--prism-primary); }
    .perf-sparkline-wrap { margin-top: 10px; position: relative; }

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

  colorFor(value: number | null): string {
    if (value === null) return '';
    if (value >= this.critMs()) return 'var(--prism-danger)';
    if (value >= this.warnMs()) return 'var(--prism-warn)';
    return 'var(--prism-success)';
  }
}
