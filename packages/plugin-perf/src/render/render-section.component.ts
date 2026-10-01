import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { PerfRenderService } from './perf-render.service.js';
import { SparklineComponent } from './sparkline.component.js';

@Component({
    selector: 'perf-render-section',
    standalone: true,
    imports: [SparklineComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './render-section.component.html',
    styleUrl: './render-section.component.css'
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
