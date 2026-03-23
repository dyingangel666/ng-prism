import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'perf-sparkline',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="prism-perf-sparkline-wrap">
      <svg class="prism-perf-sparkline-svg" [attr.viewBox]="'0 0 600 ' + height()" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="perf-sparkg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#a78bfa" stop-opacity="0.35"/>
            <stop offset="100%" stop-color="#a78bfa" stop-opacity="0.0"/>
          </linearGradient>
          <filter id="perf-glow">
            <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
            <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        @if (warnY() !== null) {
          <line [attr.x1]="0" [attr.y1]="warnY()" [attr.x2]="600" [attr.y2]="warnY()"
                stroke="#fbbf24" stroke-width="0.8" stroke-dasharray="4 4" opacity="0.4"/>
          <text [attr.x]="3" [attr.y]="warnY()! - 3" font-size="8" fill="#fbbf24" opacity="0.5"
                font-family="monospace">{{ thresholdWarn() }}ms</text>
        }

        <path [attr.d]="areaPath()" fill="url(#perf-sparkg)"/>
        <path [attr.d]="linePath()" fill="none" stroke="#a78bfa" stroke-width="1.5" filter="url(#perf-glow)"/>

        @if (peakPoint(); as peak) {
          <circle [attr.cx]="peak.x" [attr.cy]="peak.y" r="3" fill="#fbbf24" filter="url(#perf-glow)"/>
        }

        @if (currentPoint(); as current) {
          <circle [attr.cx]="current.x" [attr.cy]="current.y" r="2.5" fill="#a78bfa"/>
          <circle [attr.cx]="current.x" [attr.cy]="current.y" r="5" fill="none" stroke="#a78bfa" stroke-width="1" opacity="0.4">
            <animate attributeName="r" values="3;7" dur="1.5s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.4;0" dur="1.5s" repeatCount="indefinite"/>
          </circle>
        }
      </svg>
    </div>
  `,
  styles: `
    .prism-perf-sparkline-wrap {
      position: relative;
    }
    .prism-perf-sparkline-svg {
      width: 100%;
      height: 52px;
    }
  `,
})
export class SparklineComponent {
  readonly samples = input<number[]>([]);
  readonly thresholdWarn = input(5);
  readonly height = input(52);

  private readonly points = computed(() => {
    const data = this.samples();
    const h = this.height();
    if (data.length === 0) return [];

    const max = Math.max(...data, this.thresholdWarn() * 1.2);
    const step = data.length > 1 ? 600 / (data.length - 1) : 300;

    return data.map((v, i) => ({
      x: i * step,
      y: h - 4 - ((v / max) * (h - 8)),
      value: v,
    }));
  });

  readonly linePath = computed(() => {
    const pts = this.points();
    if (pts.length === 0) return '';
    return 'M' + pts.map((p) => `${p.x},${p.y}`).join(' L');
  });

  readonly areaPath = computed(() => {
    const pts = this.points();
    const h = this.height();
    if (pts.length === 0) return '';
    const line = pts.map((p) => `${p.x},${p.y}`).join(' L');
    return `M${pts[0].x},${h} L${line} L${pts[pts.length - 1].x},${h} Z`;
  });

  readonly warnY = computed(() => {
    const data = this.samples();
    const h = this.height();
    if (data.length === 0) return null;
    const max = Math.max(...data, this.thresholdWarn() * 1.2);
    return h - 4 - ((this.thresholdWarn() / max) * (h - 8));
  });

  readonly peakPoint = computed(() => {
    const pts = this.points();
    if (pts.length < 2) return null;
    let peak = pts[0];
    for (const p of pts) {
      if (p.value > peak.value) peak = p;
    }
    return peak.value > this.thresholdWarn() ? peak : null;
  });

  readonly currentPoint = computed(() => {
    const pts = this.points();
    return pts.length > 0 ? pts[pts.length - 1] : null;
  });
}
