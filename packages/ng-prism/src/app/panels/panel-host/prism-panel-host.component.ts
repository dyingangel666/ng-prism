import { NgComponentOutlet } from '@angular/common';
import { Component, computed, createEnvironmentInjector, effect, EnvironmentInjector, inject, OnDestroy, signal, type Type } from '@angular/core';
import { BUILTIN_PANELS } from '../builtin-panels.js';
import { A11yAuditService } from '../a11y/a11y-audit.service.js';
import { A11yScoreComponent } from '../a11y/a11y-score.component.js';
import { PrismNavigationService } from '../../services/prism-navigation.service.js';
import { PrismPanelService } from '../../services/prism-panel.service.js';
import { PrismPluginService } from '../../services/prism-plugin.service.js';
import { PrismRendererService } from '../../services/prism-renderer.service.js';
import type { A11yCoreConfig } from '../a11y/a11y.types.js';

@Component({
  selector: 'prism-panel-host',
  standalone: true,
  imports: [NgComponentOutlet, A11yScoreComponent],
  template: `
    <div class="prism-panel-host">
      <div class="prism-panel-host__tabs">
        @for (panel of allPanels(); track panel.id) {
          <button
            class="prism-panel-host__tab"
            [class.prism-panel-host__tab--active]="panelService.activePanelId() === panel.id"
            (click)="panelService.activePanelId.set(panel.id)"
          >
            @if (panel.id === 'a11y' && a11yScore() !== null) {
              <prism-a11y-score [score]="a11yScore()!" [compact]="true" style="width:18px;height:18px;" />
            }
            @if (panel.id === 'coverage' && coverageScore() !== null) {
              <prism-a11y-score [score]="coverageScore()!" [compact]="true" style="width:18px;height:18px;" />
            }
            {{ panel.label }}
          </button>
        }
      </div>
      <div class="prism-panel-host__content">
        @if (resolvedComponent()) {
          <ng-container *ngComponentOutlet="resolvedComponent(); inputs: panelInputs(); injector: activeInjector()" />
        }
      </div>
    </div>
  `,
  styles: `
    .prism-panel-host {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: var(--prism-bg-elevated);
    }

    .prism-panel-host__tabs {
      display: flex;
      border-bottom: 1px solid var(--prism-border);
      padding: 0 8px;
      flex-shrink: 0;
      background: var(--prism-bg-elevated);
    }

    .prism-panel-host__tab {
      padding: 9px 14px;
      font-size: 13px;
      font-family: var(--prism-font-sans);
      border: none;
      background: none;
      color: var(--prism-text-muted);
      cursor: pointer;
      position: relative;
      margin-bottom: -1px;
      transition: color 0.12s;
    }

    .prism-panel-host__tab::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 8px;
      right: 8px;
      height: 2px;
      background: linear-gradient(90deg, var(--prism-primary-from), var(--prism-primary-to));
      opacity: 0;
      transition: opacity 0.12s;
    }

    .prism-panel-host__tab:hover { color: var(--prism-text-2); }

    .prism-panel-host__tab--active { color: var(--prism-primary); font-weight: 500; }

    .prism-panel-host__tab--active::after { opacity: 1; }

    .prism-panel-host__tab { display: flex; align-items: center; gap: 6px; }

    .prism-panel-host__content {
      flex: 1;
      overflow: auto;
    }
  `,
})
export class PrismPanelHostComponent implements OnDestroy {
  private readonly pluginService = inject(PrismPluginService);
  private readonly nav = inject(PrismNavigationService);
  protected readonly panelService = inject(PrismPanelService);
  private readonly envInjector = inject(EnvironmentInjector);
  private readonly auditService = inject(A11yAuditService);
  private readonly rendererService = inject(PrismRendererService);

  protected readonly a11yScore = computed(() => this.auditService.scoreResult()?.score ?? null);

  protected readonly coverageScore = computed(() => {
    const comp = this.nav.activeComponent() as any;
    const coverage = comp?.meta?.showcaseConfig?.meta?.['coverage'];
    if (!coverage?.found) return null;
    return coverage.score as number;
  });

  private readonly builtInPanels = BUILTIN_PANELS;

  protected readonly allPanels = computed(() => [
    ...this.builtInPanels.filter((p) => p.placement !== 'view'),
    ...this.pluginService.addonPanels(),
  ]);
  protected readonly resolvedComponent = signal<Type<unknown> | null>(null);
  protected readonly panelInputs = computed(() => ({
    activeComponent: this.nav.activeComponent(),
  }));

  private readonly lazyCache = new Map<string, Type<unknown>>();
  private readonly injectorCache = new Map<string, EnvironmentInjector>();

  protected readonly activeInjector = computed(() => {
    const panelId = this.panelService.activePanelId();
    const panel = this.allPanels().find((p) => p.id === panelId);
    if (!panel?.providers?.length) return this.envInjector;

    if (!this.injectorCache.has(panel.id)) {
      this.injectorCache.set(
        panel.id,
        createEnvironmentInjector(panel.providers, this.envInjector, `PrismPanel[${panel.id}]`),
      );
    }
    return this.injectorCache.get(panel.id)!;
  });

  constructor() {
    effect(() => {
      const element = this.rendererService.renderedElement();
      const comp = this.nav.activeComponent() as any;
      this.rendererService.inputValues();
      this.rendererService.activeVariantIndex();

      if (!element || !comp) {
        this.auditService.clear();
        return;
      }

      const a11yConfig: A11yCoreConfig | undefined = comp.meta?.showcaseConfig?.meta?.['a11y'];
      if (a11yConfig?.disable === true) {
        this.auditService.clear();
        return;
      }

      this.auditService.scheduleAudit(element, a11yConfig);
    });

    effect(() => {
      const panel = this.allPanels().find((p) => p.id === this.panelService.activePanelId()) ?? null;
      if (!panel) {
        this.resolvedComponent.set(null);
        return;
      }

      if (panel.component) {
        this.resolvedComponent.set(panel.component);
        return;
      }

      if (panel.loadComponent) {
        const cached = this.lazyCache.get(panel.id);
        if (cached) {
          this.resolvedComponent.set(cached);
          return;
        }

        this.resolvedComponent.set(null);
        panel.loadComponent().then((comp) => {
          this.lazyCache.set(panel.id, comp);
          this.resolvedComponent.set(comp);
        });
      }
    });
  }

  ngOnDestroy(): void {
    this.injectorCache.forEach((injector) => injector.destroy());
  }
}
