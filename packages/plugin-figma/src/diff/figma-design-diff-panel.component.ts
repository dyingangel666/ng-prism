import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { PrismNavigationService, PrismRendererService } from 'ng-prism';
import { FIGMA_PLUGIN_CONFIG } from '../figma-config.token.js';
import { type DiffMode, type DiffResult, type DiffState, extractFileKey, parseFigmaMeta } from './figma-diff.types.js';

@Component({
  selector: 'prism-figma-design-diff-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="diff-panel">
      @switch (state().status) {
        @case ('error-no-token') {
          <div class="diff-panel__empty">
            <p class="diff-panel__empty-title">Access Token fehlt</p>
            <p class="diff-panel__empty-hint">
              Konfiguriere <code>figmaPlugin(&#123; accessToken: '...' &#125;)</code> in deiner
              <code>ng-prism.config.ts</code>.
            </p>
          </div>
        }
        @case ('error-no-node') {
          <div class="diff-panel__empty">
            <p class="diff-panel__empty-title">Kein Figma-Node für diese Variante</p>
            <p class="diff-panel__empty-hint">
              Füge <code>meta: &#123; figma: '…?node-id=12-34' &#125;</code> zur aktiven Variante hinzu.
            </p>
          </div>
        }
        @case ('error-api') {
          <div class="diff-panel__empty diff-panel__empty--error">
            <p class="diff-panel__empty-title">Figma API Fehler</p>
            <p class="diff-panel__empty-hint">{{ errorMessage() }}</p>
          </div>
        }
        @case ('idle') {
          <div class="diff-panel__idle">
            <button class="diff-panel__run-btn" (click)="runDiff()">
              ▶ Design Diff ausführen
            </button>
          </div>
        }
        @case ('loading') {
          <div class="diff-panel__loading">
            <span class="diff-panel__spinner"></span>
            <span>Lade Screenshots…</span>
          </div>
        }
        @case ('done') {
          <div class="diff-panel__result">
            <div class="diff-panel__toolbar">
              <div class="diff-panel__modes">
                @for (m of modes; track m.value) {
                  <button
                    class="diff-panel__mode-btn"
                    [class.diff-panel__mode-btn--active]="activeMode() === m.value"
                    (click)="activeMode.set(m.value)"
                  >{{ m.label }}</button>
                }
              </div>
              <span class="diff-panel__stats">
                {{ similarity() }}% match &middot; {{ doneResult()!.diffPixels.toLocaleString() }} px diff
              </span>
              <button class="diff-panel__run-btn diff-panel__run-btn--sm" (click)="runDiff()">
                ↺ Erneut
              </button>
            </div>
            <div class="diff-panel__canvas-area">
              @if (activeMode() === 'side-by-side') {
                <div class="diff-panel__split">
                  <div class="diff-panel__split-side">
                    <span class="diff-panel__split-label">ng-prism</span>
                    <img [src]="doneResult()!.componentDataUrl" alt="Component screenshot" />
                  </div>
                  <div class="diff-panel__split-side">
                    <span class="diff-panel__split-label">Figma</span>
                    <img [src]="doneResult()!.figmaDataUrl" alt="Figma design" />
                  </div>
                </div>
              }
              @if (activeMode() === 'overlay') {
                <div class="diff-panel__overlay-wrap">
                  <img class="diff-panel__overlay-base" [src]="doneResult()!.componentDataUrl" alt="Component" />
                  <img
                    class="diff-panel__overlay-top"
                    [src]="doneResult()!.figmaDataUrl"
                    [style.opacity]="overlayOpacity() / 100"
                    alt="Figma overlay"
                  />
                </div>
                <input
                  class="diff-panel__opacity-slider"
                  type="range" min="0" max="100"
                  [value]="overlayOpacity()"
                  (input)="overlayOpacity.set(+$any($event.target).value)"
                />
              }
              @if (activeMode() === 'diff-only') {
                <img [src]="doneResult()!.diffDataUrl" alt="Pixel diff" />
              }
            </div>
          </div>
        }
      }
    </div>
  `,
  styles: `
    .diff-panel {
      height: 100%;
      display: flex;
      flex-direction: column;
      font-family: var(--prism-font-sans);
      font-size: 13px;
      color: var(--prism-text-1);
      background: var(--prism-bg-elevated);
    }

    .diff-panel__empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      gap: 8px;
      padding: 24px;
      text-align: center;
    }

    .diff-panel__empty-title { font-weight: 500; color: var(--prism-text-1); margin: 0; }
    .diff-panel__empty-hint { color: var(--prism-text-muted); margin: 0; }
    .diff-panel__empty--error .diff-panel__empty-title { color: #ef4444; }

    .diff-panel__idle {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
    }

    .diff-panel__loading {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      height: 100%;
      color: var(--prism-text-muted);
    }

    .diff-panel__spinner {
      width: 16px;
      height: 16px;
      border: 2px solid var(--prism-border);
      border-top-color: var(--prism-primary);
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    .diff-panel__run-btn {
      padding: 8px 16px;
      background: var(--prism-primary);
      color: #fff;
      border: none;
      border-radius: 6px;
      font-size: 13px;
      font-family: var(--prism-font-sans);
      cursor: pointer;
    }

    .diff-panel__run-btn:hover { opacity: 0.9; }
    .diff-panel__run-btn--sm { padding: 5px 10px; font-size: 12px; }

    .diff-panel__result { display: flex; flex-direction: column; height: 100%; }

    .diff-panel__toolbar {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 12px;
      border-bottom: 1px solid var(--prism-border);
      flex-shrink: 0;
    }

    .diff-panel__modes { display: flex; gap: 2px; }

    .diff-panel__mode-btn {
      padding: 4px 10px;
      border: 1px solid var(--prism-border);
      background: none;
      font-size: 12px;
      font-family: var(--prism-font-sans);
      color: var(--prism-text-muted);
      cursor: pointer;
      border-radius: 4px;
    }

    .diff-panel__mode-btn--active {
      background: var(--prism-primary);
      color: #fff;
      border-color: var(--prism-primary);
    }

    .diff-panel__stats {
      margin-left: auto;
      color: var(--prism-text-muted);
      font-variant-numeric: tabular-nums;
    }

    .diff-panel__canvas-area {
      flex: 1;
      overflow: auto;
      padding: 16px;
      display: flex;
      align-items: flex-start;
      justify-content: center;
    }

    .diff-panel__split { display: flex; gap: 16px; width: 100%; }

    .diff-panel__split-side { flex: 1; display: flex; flex-direction: column; gap: 6px; }

    .diff-panel__split-label {
      font-size: 11px;
      font-weight: 500;
      color: var(--prism-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .diff-panel__split-side img,
    .diff-panel__canvas-area img {
      max-width: 100%;
      border: 1px solid var(--prism-border);
      border-radius: 4px;
    }

    .diff-panel__overlay-wrap { position: relative; display: inline-block; }

    .diff-panel__overlay-top {
      position: absolute;
      top: 0; left: 0;
      width: 100%; height: 100%;
    }

    .diff-panel__opacity-slider { display: block; width: 200px; margin-top: 12px; }
  `,
})
export class FigmaDesignDiffPanelComponent {
  private readonly config = inject(FIGMA_PLUGIN_CONFIG);
  private readonly nav = inject(PrismNavigationService);
  private readonly renderer = inject(PrismRendererService);

  protected readonly state = signal<DiffState>({ status: 'idle' });
  protected readonly activeMode = signal<DiffMode>('side-by-side');
  protected readonly overlayOpacity = signal(50);

  protected readonly modes: { value: DiffMode; label: string }[] = [
    { value: 'side-by-side', label: 'Side-by-side' },
    { value: 'overlay', label: 'Overlay' },
    { value: 'diff-only', label: 'Diff' },
  ];

  protected readonly doneResult = computed<DiffResult | null>(() => {
    const s = this.state();
    return s.status === 'done' ? s.result : null;
  });

  protected readonly similarity = computed(() => {
    const r = this.doneResult();
    return r ? r.similarity.toFixed(1) : '0';
  });

  protected readonly errorMessage = computed(() => {
    const s = this.state();
    return s.status === 'error-api' ? s.message : '';
  });

  protected readonly activeVariantMeta = computed(() => {
    const comp = this.nav.activeComponent();
    if (!comp) return null;
    const variants = comp.meta.showcaseConfig.variants;
    const idx = this.renderer.activeVariantIndex();
    const variantFigma = variants?.[idx]?.meta?.['figma'];
    if (variantFigma !== undefined) return parseFigmaMeta(variantFigma);
    return parseFigmaMeta(comp.meta.showcaseConfig.meta?.['figma']);
  });

  protected runDiff(): void {
    if (!this.config.accessToken) {
      this.state.set({ status: 'error-no-token' });
      return;
    }

    const meta = this.activeVariantMeta();
    if (!meta) {
      this.state.set({ status: 'error-no-node' });
      return;
    }

    const fileKey = extractFileKey(meta.url);
    if (!fileKey) {
      this.state.set({ status: 'error-api', message: 'Ungültige Figma-URL' });
      return;
    }

    this.state.set({ status: 'loading' });
    this.executeDiff(fileKey, meta.nodeId);
  }

  private async executeDiff(fileKey: string, nodeId: string): Promise<void> {
    try {
      const [{ computeDesignDiff }, { captureDomElement }, { fetchFigmaImage }] = await Promise.all([
        import('./design-diff.engine.js'),
        import('./component-screenshot.service.js'),
        import('./figma-api.service.js'),
      ]);

      const element = this.renderer.renderedElement() as HTMLElement | null;
      const [componentCanvas, figmaBlob] = await Promise.all([
        captureDomElement(element),
        fetchFigmaImage(fileKey, nodeId, this.config.accessToken!),
      ]);

      const result = await computeDesignDiff(componentCanvas, figmaBlob);
      this.state.set({ status: 'done', result });
    } catch (err) {
      this.state.set({
        status: 'error-api',
        message: err instanceof Error ? err.message : 'Unbekannter Fehler',
      });
    }
  }
}
