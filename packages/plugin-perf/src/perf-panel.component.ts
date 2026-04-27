import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
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
  imports: [BundleSectionComponent, RenderSectionComponent, MemorySectionComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="prism-perf-panel">
      <div class="prism-perf-subtabs">
        <button class="prism-perf-subtab" [class.active]="activeTab() === 'bundle'" (click)="activeTab.set('bundle')">
          <span class="prism-perf-subtab-icon">&#128230;</span> Bundle
        </button>
        <button class="prism-perf-subtab" [class.active]="activeTab() === 'render'" (click)="activeTab.set('render')">
          <span class="prism-perf-subtab-icon">&#9201;</span> Render
        </button>
        <button class="prism-perf-subtab" [class.active]="activeTab() === 'memory'" (click)="activeTab.set('memory')">
          <span class="prism-perf-subtab-icon">&#129504;</span> Memory
        </button>
        @if (renderService.cdRunCount() > 0) {
          <div class="prism-perf-cd-badge">{{ renderService.cdRunCount() }} CD runs</div>
        }
      </div>

      @if (activeTab() === 'render') {
        <div class="prism-perf-toolbar">
          @if (renderService.isRecording()) {
            <button class="prism-perf-btn prism-perf-btn--primary" (click)="renderService.stopRecording()">
              <i class="prism-perf-btn-icon">&#9208;</i> Pause
            </button>
          } @else {
            <button class="prism-perf-btn prism-perf-btn--primary" (click)="renderService.startRecording()">
              <i class="prism-perf-btn-icon">&#9654;</i> Profile
            </button>
          }
          <button class="prism-perf-btn" (click)="renderService.clear()">
            <i class="prism-perf-btn-icon">&#10005;</i> Clear
          </button>
          <div class="prism-perf-toolbar-spacer"></div>
          @if (renderService.isRecording()) {
            <div class="prism-perf-status">
              <div class="prism-perf-status-dot"></div>
              live · {{ renderService.sampleCount() }} samples
            </div>
          }
        </div>
      }

      @if (activeTab() === 'memory') {
        <div class="prism-perf-toolbar">
          <button class="prism-perf-btn prism-perf-btn--primary" (click)="captureMemorySnapshots()">
            <i class="prism-perf-btn-icon">&#9654;</i> Snapshot
          </button>
          <button class="prism-perf-btn" (click)="memoryService.clear()">
            <i class="prism-perf-btn-icon">&#10005;</i> Clear
          </button>
          <div class="prism-perf-toolbar-spacer"></div>
        </div>
      }

      <div class="prism-perf-content">
        @switch (activeTab()) {
          @case ('bundle') {
            <perf-bundle-section
              [metrics]="bundleMetrics()"
              [warnKb]="thresholds.bundleWarnKb"
              [critKb]="thresholds.bundleCritKb"
            />
          }
          @case ('render') {
            <perf-render-section
              [renderService]="renderService"
              [warnMs]="thresholds.renderWarnMs"
              [critMs]="thresholds.renderCritMs"
            />
          }
          @case ('memory') {
            <perf-memory-section [memoryService]="memoryService" />
          }
        }
      </div>
    </div>
  `,
  styles: `
    .prism-perf-panel { display: flex; flex-direction: column; height: 340px; }
    .prism-perf-subtabs {
      display: flex; align-items: center;
      background: var(--prism-bg-elevated);
      border-bottom: 1px solid var(--prism-border);
      padding: 0 4px;
    }
    .prism-perf-subtab {
      padding: 7px 12px; font-size: 11px;
      font-family: var(--font-sans); font-weight: 500;
      color: var(--prism-text-muted); border: none; background: none;
      cursor: pointer; position: relative;
      display: flex; align-items: center; gap: 5px;
      transition: color var(--dur-fast); user-select: none;
    }
    .prism-perf-subtab::after {
      content: ''; position: absolute;
      bottom: -1px; left: 4px; right: 4px; height: 2px;
      background: var(--prism-primary); opacity: 0;
    }
    .prism-perf-subtab.active { color: var(--prism-primary); }
    .prism-perf-subtab.active::after { opacity: 1; }
    .prism-perf-subtab-icon { font-size: 10px; opacity: 0.8; }
    .prism-perf-cd-badge {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 2px 8px; border-radius: var(--radius-xs);
      background: color-mix(in srgb, var(--prism-primary) 12%, transparent);
      border: 1px solid color-mix(in srgb, var(--prism-primary) 20%, transparent);
      font-size: 10px; font-family: var(--font-mono);
      color: var(--prism-primary); margin-left: auto;
    }
    .prism-perf-toolbar {
      display: flex; align-items: center; gap: 6px;
      padding: 6px 12px;
      border-bottom: 1px solid var(--prism-border);
      background: var(--prism-bg-surface); flex-shrink: 0;
    }
    .prism-perf-btn {
      display: flex; align-items: center; gap: 5px;
      padding: 4px 10px;
      border: 1px solid var(--prism-border-strong);
      border-radius: var(--radius-sm);
      background: var(--prism-bg-elevated);
      color: var(--prism-text-2);
      font-family: var(--font-sans); font-size: 11px; font-weight: 500;
      cursor: pointer;
      transition: background var(--dur-fast), border-color var(--dur-fast), color var(--dur-fast);
    }
    .prism-perf-btn:hover {
      background: color-mix(in srgb, var(--prism-primary) 12%, var(--prism-bg-elevated));
      border-color: color-mix(in srgb, var(--prism-primary) 40%, transparent);
      color: var(--prism-primary);
    }
    .prism-perf-btn--primary {
      background: color-mix(in srgb, var(--prism-primary) 15%, var(--prism-bg-elevated));
      border-color: color-mix(in srgb, var(--prism-primary) 35%, transparent);
      color: var(--prism-primary);
    }
    .prism-perf-btn--primary:hover {
      background: color-mix(in srgb, var(--prism-primary) 22%, var(--prism-bg-elevated));
    }
    .prism-perf-btn-icon { font-style: normal; font-size: 10px; }
    .prism-perf-toolbar-spacer { flex: 1; }
    .prism-perf-status {
      font-size: 10px; color: var(--prism-text-ghost);
      font-family: var(--font-mono);
      display: flex; align-items: center; gap: 5px;
    }
    .prism-perf-status-dot {
      width: 5px; height: 5px; border-radius: 50%;
      background: var(--prism-success);
      box-shadow: 0 0 6px var(--prism-success);
      animation: prism-perf-pulse 2s ease-in-out infinite;
    }
    @keyframes prism-perf-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
    .prism-perf-content {
      flex: 1; overflow-y: auto;
      background: var(--prism-bg-surface);
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
    const comp = this.activeComponent() as { meta?: { showcaseConfig?: { meta?: { perf?: { bundle?: BundleMetrics } } } } } | null;
    return comp?.meta?.showcaseConfig?.meta?.perf?.bundle ?? null;
  });
}
