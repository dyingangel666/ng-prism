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
    .prism-perf-panel {
      display: flex;
      flex-direction: column;
      height: 340px;
    }
    .prism-perf-subtabs {
      display: flex;
      align-items: center;
      background: var(--prism-bg-elevated, #1a1535);
      border-bottom: 1px solid var(--prism-border, rgba(255,255,255,0.08));
      padding: 0 4px;
    }
    .prism-perf-subtab {
      padding: 7px 12px;
      font-size: 11px;
      font-family: var(--prism-font-sans, system-ui);
      font-weight: 500;
      color: var(--prism-text-muted, #8476a2);
      border: none;
      background: none;
      cursor: pointer;
      position: relative;
      display: flex;
      align-items: center;
      gap: 5px;
      transition: color 0.12s;
      letter-spacing: 0.01em;
      user-select: none;
    }
    .prism-perf-subtab::after {
      content: '';
      position: absolute;
      bottom: -1px; left: 4px; right: 4px;
      height: 2px;
      background: var(--prism-primary, #a78bfa);
      opacity: 0;
    }
    .prism-perf-subtab.active { color: var(--prism-primary, #a78bfa); }
    .prism-perf-subtab.active::after { opacity: 1; }
    .prism-perf-subtab-icon { font-size: 10px; opacity: 0.8; }
    .prism-perf-cd-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      border-radius: 3px;
      background: color-mix(in srgb, var(--prism-primary, #a78bfa) 12%, transparent);
      border: 1px solid color-mix(in srgb, var(--prism-primary, #a78bfa) 20%, transparent);
      font-size: 10px;
      font-family: var(--prism-font-mono, monospace);
      color: var(--prism-primary, #a78bfa);
      margin-left: auto;
    }
    .prism-perf-toolbar {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-bottom: 1px solid var(--prism-border, rgba(255,255,255,0.08));
      background: var(--prism-bg-surface, #131022);
      flex-shrink: 0;
    }
    .prism-perf-btn {
      display: flex;
      align-items: center;
      gap: 5px;
      padding: 4px 10px;
      border: 1px solid var(--prism-border-strong, rgba(255,255,255,0.16));
      border-radius: 5px;
      background: var(--prism-bg-elevated, #1a1535);
      color: var(--prism-text-2, #b0a6c8);
      font-family: var(--prism-font-sans, system-ui);
      font-size: 11px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.1s, border-color 0.1s, color 0.1s;
      user-select: none;
    }
    .prism-perf-btn:hover {
      background: color-mix(in srgb, var(--prism-primary, #a78bfa) 12%, var(--prism-bg-elevated, #1a1535));
      border-color: color-mix(in srgb, var(--prism-primary, #a78bfa) 40%, transparent);
      color: var(--prism-primary, #a78bfa);
    }
    .prism-perf-btn--primary {
      background: color-mix(in srgb, var(--prism-primary, #a78bfa) 15%, var(--prism-bg-elevated, #1a1535));
      border-color: color-mix(in srgb, var(--prism-primary, #a78bfa) 35%, transparent);
      color: var(--prism-primary, #a78bfa);
    }
    .prism-perf-btn--primary:hover {
      background: color-mix(in srgb, var(--prism-primary, #a78bfa) 22%, var(--prism-bg-elevated, #1a1535));
    }
    .prism-perf-btn-icon { font-style: normal; font-size: 10px; }
    .prism-perf-toolbar-spacer { flex: 1; }
    .prism-perf-status {
      font-size: 10px;
      color: var(--prism-text-ghost, #6a5d87);
      font-family: var(--prism-font-mono, monospace);
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .prism-perf-status-dot {
      width: 5px; height: 5px;
      border-radius: 50%;
      background: var(--perf-ok, #4ade80);
      box-shadow: 0 0 6px var(--perf-ok, #4ade80);
      animation: prism-perf-pulse 2s ease-in-out infinite;
    }
    @keyframes prism-perf-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }
    .prism-perf-content {
      flex: 1;
      overflow-y: auto;
      background: var(--prism-bg-surface, #131022);
      scrollbar-width: thin;
      scrollbar-color: var(--prism-border, rgba(255,255,255,0.08)) transparent;
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
