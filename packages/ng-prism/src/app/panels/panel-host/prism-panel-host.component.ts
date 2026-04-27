import { NgComponentOutlet } from '@angular/common';
import { Component, computed, createEnvironmentInjector, effect, EnvironmentInjector, inject, OnDestroy, signal, type Type, ChangeDetectionStrategy } from '@angular/core';
import { PrismIconComponent } from '../../icons/prism-icon.component.js';
import { BUILTIN_PANELS } from '../builtin-panels.js';
import { A11yAuditService } from '../a11y/a11y-audit.service.js';
import { PrismNavigationService } from '../../services/prism-navigation.service.js';
import { PrismPanelService } from '../../services/prism-panel.service.js';
import { PrismPluginService } from '../../services/prism-plugin.service.js';
import { PrismRendererService } from '../../services/prism-renderer.service.js';
import type { A11yCoreConfig } from '../a11y/a11y.types.js';

@Component({
  selector: 'prism-panel-host',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgComponentOutlet, PrismIconComponent],
  template: `
    <div class="panel">
      <nav class="panel-tabs" role="tablist">
        @for (panel of allPanels(); track panel.id) {
          <button
            class="p-tab"
            [class.p-tab--active]="panelService.activePanelId() === panel.id"
            (click)="panelService.activePanelId.set(panel.id)"
            role="tab"
            [attr.aria-selected]="panelService.activePanelId() === panel.id"
            [attr.aria-controls]="'panel-' + panel.id"
          >
            @if (panel.icon) {
              <prism-icon [name]="panel.icon" [size]="13" />
            }
            {{ panel.label }}
            @if (panelBadge(panel.id); as badge) {
              <span
                class="p-tab-badge"
                [class.ok]="badge.variant === 'ok'"
                [class.warn]="badge.variant === 'warn'"
                [class.danger]="badge.variant === 'danger'"
              >{{ badge.text }}</span>
            }
          </button>
        }
      </nav>
      <div class="panel-body" [id]="'panel-' + panelService.activePanelId()" role="tabpanel">
        @if (resolvedComponent()) {
          <ng-container *ngComponentOutlet="resolvedComponent(); inputs: panelInputs(); injector: activeInjector()" />
        }
      </div>
    </div>
  `,
  styles: `
    .panel {
      background: var(--prism-bg-elevated);
      border-top: 1px solid var(--prism-border);
      display: flex;
      flex-direction: column;
      min-height: 0;
      overflow: hidden;
      height: 100%;
    }

    .panel-tabs {
      display: flex;
      align-items: center;
      gap: 2px;
      padding: 0 16px;
      height: 40px;
      border-bottom: 1px solid var(--prism-border);
      background: var(--prism-bg);
      overflow-x: auto;
      scrollbar-width: none;
      flex-shrink: 0;
    }
    .panel-tabs::-webkit-scrollbar { display: none; }

    .p-tab {
      position: relative;
      height: 100%;
      display: flex;
      align-items: center;
      gap: 7px;
      padding: 0 12px;
      font-size: var(--fs-md);
      font-weight: 500;
      color: var(--prism-text-muted);
      white-space: nowrap;
      transition: color var(--dur-fast);
      background: none;
      border: none;
      cursor: pointer;
      font-family: var(--font-sans);
    }
    .p-tab:hover { color: var(--prism-text-2); }
    .p-tab--active { color: var(--prism-text); }
    .p-tab--active::after {
      content: '';
      position: absolute;
      left: 8px;
      right: 8px;
      bottom: -1px;
      height: 2px;
      background: linear-gradient(90deg, var(--prism-primary-from), var(--prism-primary-to));
      border-radius: 1px;
    }

    .p-tab-badge {
      min-width: 16px;
      height: 16px;
      padding: 0 5px;
      border-radius: 8px;
      background: color-mix(in srgb, var(--prism-primary) 18%, transparent);
      color: var(--prism-primary);
      font-family: var(--font-mono);
      font-size: 10px;
      font-weight: 700;
      display: grid;
      place-items: center;
    }
    .p-tab-badge.ok {
      background: color-mix(in srgb, var(--prism-success) 18%, transparent);
      color: var(--prism-success);
    }
    .p-tab-badge.warn {
      background: color-mix(in srgb, var(--prism-warn) 18%, transparent);
      color: var(--prism-warn);
    }
    .p-tab-badge.danger {
      background: color-mix(in srgb, var(--prism-danger) 18%, transparent);
      color: var(--prism-danger);
    }

    .panel-tabs-right {
      margin-left: auto;
      display: flex;
      align-items: center;
      gap: 4px;
      padding-left: 10px;
    }

    .icon-btn {
      width: 28px;
      height: 28px;
      display: grid;
      place-items: center;
      border-radius: var(--radius-sm);
      color: var(--prism-text-muted);
      background: none;
      border: none;
      cursor: pointer;
      transition: all var(--dur-fast);
    }
    .icon-btn:hover {
      background: var(--prism-input-bg);
      color: var(--prism-text);
    }

    .panel-body {
      flex: 1;
      min-height: 0;
      overflow: auto;
      background: var(--prism-bg-elevated);
    }
    .panel-body::-webkit-scrollbar { width: 8px; height: 8px; }
    .panel-body::-webkit-scrollbar-thumb { background: var(--prism-border-strong); border-radius: 4px; }

    :focus-visible {
      outline: 2px solid var(--prism-primary);
      outline-offset: 2px;
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

  private readonly a11yScore = computed(() => this.auditService.scoreResult()?.score ?? null);

  private readonly coverageScore = computed(() => {
    const comp = this.nav.activeComponent() as any;
    const coverage = comp?.meta?.showcaseConfig?.meta?.['coverage'];
    if (!coverage?.found) return null;
    return coverage.score as number;
  });

  private readonly inputCount = computed(() => {
    const comp = this.nav.activeComponent();
    return comp?.meta.inputs.length ?? 0;
  });

  protected panelBadge(panelId: string): { text: string; variant: 'default' | 'ok' | 'warn' | 'danger' } | null {
    if (panelId === 'controls') {
      const count = this.inputCount();
      return count > 0 ? { text: String(count), variant: 'default' } : null;
    }
    if (panelId === 'a11y') {
      const score = this.a11yScore();
      if (score === null) return null;
      return {
        text: String(score),
        variant: score >= 90 ? 'ok' : score >= 70 ? 'warn' : 'danger',
      };
    }
    if (panelId === 'coverage') {
      const score = this.coverageScore();
      if (score === null) return null;
      return {
        text: String(score),
        variant: score >= 90 ? 'ok' : score >= 70 ? 'warn' : 'danger',
      };
    }
    return null;
  }

  private readonly builtInPanels = BUILTIN_PANELS;

  protected readonly allPanels = computed(() => {
    const comp = this.nav.activeComponent();
    const panels = [
      ...this.builtInPanels.filter((p) => p.placement !== 'view'),
      ...this.pluginService.addonPanels(),
    ];
    if (!comp) return panels;
    return panels.filter((p) => !p.isVisible || p.isVisible(comp));
  });

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
      const injector = this.activeInjector();
      this.panelService.activePanelInjector.set(
        injector === this.envInjector ? null : injector,
      );
    });

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
