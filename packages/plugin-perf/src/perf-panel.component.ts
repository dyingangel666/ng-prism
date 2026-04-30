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
  template: `
    <div class="prism-perf-panel">
      <div class="prism-subtabs">
        <button
          class="prism-st-tab"
          [class.prism-st-tab--active]="activeTab() === 'bundle'"
          (click)="activeTab.set('bundle')"
        >
          Bundle
        </button>
        <button
          class="prism-st-tab"
          [class.prism-st-tab--active]="activeTab() === 'render'"
          (click)="activeTab.set('render')"
        >
          Render
        </button>
        <button
          class="prism-st-tab"
          [class.prism-st-tab--active]="activeTab() === 'memory'"
          (click)="activeTab.set('memory')"
        >
          Memory
        </button>
        @if (renderService.cdRunCount() > 0) {
        <span class="prism-perf-cd-badge"
          >{{ renderService.cdRunCount() }} CD runs</span
        >
        }
      </div>

      @if (activeTab() === 'render') {
      <div class="prism-perf-toolbar">
        @if (renderService.isRecording()) {
        <button class="prism-tool-btn" (click)="renderService.stopRecording()">
          &#9208; Pause
        </button>
        } @else {
        <button class="prism-tool-btn" (click)="renderService.startRecording()">
          &#9654; Profile
        </button>
        }
        <button class="prism-tool-btn" (click)="renderService.clear()">
          &#10005; Clear
        </button>
        @if (renderService.isRecording()) {
        <span class="prism-perf-status"
          ><span class="prism-perf-status-dot"></span> live &middot;
          {{ renderService.sampleCount() }} samples</span
        >
        }
      </div>
      } @if (activeTab() === 'memory') {
      <div class="prism-perf-toolbar">
        <button class="prism-tool-btn" (click)="captureMemorySnapshots()">
          &#9654; Snapshot
        </button>
        <button class="prism-tool-btn" (click)="memoryService.clear()">
          &#10005; Clear
        </button>
      </div>
      }

      <div class="prism-perf-content">
        @switch (activeTab()) { @case ('bundle') {
        <perf-bundle-section
          [metrics]="bundleMetrics()"
          [warnKb]="thresholds.bundleWarnKb"
          [critKb]="thresholds.bundleCritKb"
        />
        } @case ('render') {
        <perf-render-section
          [renderService]="renderService"
          [warnMs]="thresholds.renderWarnMs"
          [critMs]="thresholds.renderCritMs"
        />
        } @case ('memory') {
        <perf-memory-section [memoryService]="memoryService" />
        } }
      </div>
    </div>
  `,
  styles: `
    .prism-perf-panel {
      display: flex;
      flex-direction: column;
      height: 340px;
    }

    .prism-subtabs {
      display: flex;
      gap: 2px;
      padding: 10px 20px 0;
      border-bottom: 1px solid var(--prism-border);
      background: var(--prism-bg-elevated);
      position: sticky;
      top: 0;
      z-index: 2;
    }

    .prism-st-tab {
      padding: 7px 12px;
      font-size: 12px;
      font-weight: 500;
      color: var(--prism-text-muted);
      border-radius: 6px 6px 0 0;
      position: relative;
      display: flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      background: transparent;
      border: none;
      font-family: var(--font-sans);
      transition: color var(--dur-fast);
    }
    .prism-st-tab:hover { color: var(--prism-text-2); }
    .prism-st-tab--active { color: var(--prism-text); }
    .prism-st-tab--active::after {
      content: '';
      position: absolute;
      left: 8px;
      right: 8px;
      bottom: -1px;
      height: 2px;
      background: var(--prism-primary);
      border-radius: 1px;
    }

    .prism-perf-cd-badge {
      margin-left: auto;
      font-family: var(--font-mono, 'JetBrains Mono', monospace);
      font-size: 11px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0 8px;
      height: 24px;
      background: color-mix(in srgb, var(--prism-primary) 12%, transparent);
      color: var(--prism-primary);
      border: 1px solid color-mix(in srgb, var(--prism-primary) 25%, transparent);
      border-radius: 5px;
    }

    .prism-perf-toolbar {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 14px 24px 0;
    }
    .prism-tool-btn {
      height: 24px;
      padding: 0 9px;
      border-radius: 5px;
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 11.5px;
      color: var(--prism-text-muted);
      transition: all 0.12s;
      font-weight: 500;
      background: none;
      border: none;
      cursor: pointer;
      font-family: var(--font-sans);
    }
    .prism-tool-btn:hover {
      color: var(--prism-text);
      background: color-mix(in srgb, var(--prism-primary) 8%, transparent);
    }

    .prism-perf-status {
      margin-left: auto;
      font-size: 11px;
      color: var(--prism-text-muted);
      font-family: var(--font-mono);
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .prism-perf-status-dot {
      display: inline-block;
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: var(--prism-success);
      box-shadow: 0 0 6px var(--prism-success);
      animation: prism-perf-pulse 2s ease-in-out infinite;
    }
    @keyframes prism-perf-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }

    .prism-perf-content {
      flex: 1;
      overflow-y: auto;
    }
  `,
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
