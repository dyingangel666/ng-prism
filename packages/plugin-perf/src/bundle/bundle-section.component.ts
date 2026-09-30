import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { BundleMetrics } from '../perf.types.js';

@Component({
    selector: 'perf-bundle-section',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './bundle-section.component.html',
    styleUrl: './bundle-section.component.css'
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
