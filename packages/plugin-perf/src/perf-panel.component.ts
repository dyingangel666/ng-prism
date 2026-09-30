import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  signal,
} from '@angular/core';
import type { BundleMetrics, PerfThresholds } from './perf.types.js';
import { DEFAULT_THRESHOLDS } from './perf.types.js';
import { PerfRenderService } from './render/perf-render.service.js';
import { PerfMemoryService } from './memory/perf-memory.service.js';
import { BundleSectionComponent } from './bundle/bundle-section.component.js';
import { RenderSectionComponent } from './render/render-section.component.js';
import { MemorySectionComponent } from './memory/memory-section.component.js';

type SubTab = 'bundle' | 'render' | 'memory';

@Component({
  selector: 'prism-perf-panel',
  standalone: true,
  imports: [
    BundleSectionComponent,
    RenderSectionComponent,
    MemorySectionComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './perf-panel.component.html',
  styleUrl: './perf-panel.component.css',
})
export class PerfPanelComponent {
  readonly activeComponent = input<unknown>(null);

  readonly activeTab = signal<SubTab>('bundle');
  readonly renderService = PerfRenderService.getInstance();
  readonly memoryService = PerfMemoryService.getInstance();

  readonly thresholds: PerfThresholds = DEFAULT_THRESHOLDS;

  captureMemorySnapshots(): void {
    this.memoryService.takeSnapshot('before-create');
    setTimeout(() => this.memoryService.takeSnapshot('after-create'), 50);
  }

  readonly bundleMetrics = computed<BundleMetrics | null>(() => {
    const comp = this.activeComponent() as {
      meta?: {
        showcaseConfig?: { meta?: { perf?: { bundle?: BundleMetrics } } };
      };
    } | null;
    return comp?.meta?.showcaseConfig?.meta?.perf?.bundle ?? null;
  });
}
