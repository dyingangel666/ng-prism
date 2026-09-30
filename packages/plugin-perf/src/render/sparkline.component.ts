import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
    selector: 'perf-sparkline',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './sparkline.component.html',
    styleUrl: './sparkline.component.css'
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
            y: h - 4 - (v / max) * (h - 8),
            value: v
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
        return h - 4 - (this.thresholdWarn() / max) * (h - 8);
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
