import {
  Component,
  ChangeDetectionStrategy,
  type ComponentRef,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  Injector,
  signal,
  type Type,
  untracked,
  viewChild,
  ViewContainerRef,
} from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import type {
  PanelDefinition,
  RuntimeComponent,
} from '../../plugin/plugin.types.js';
import type { ComponentPage } from '../../plugin/page.types.js';
import { PrismManifestService } from '../services/prism-manifest.service.js';
import { BUILTIN_PANELS } from '../panels/builtin-panels.js';
import { PRISM_RENDERER_HOOKS } from '../tokens/prism-tokens.js';

import { PrismEventLogService } from '../services/prism-event-log.service.js';
import { PrismNavigationService } from '../services/prism-navigation.service.js';
import { PrismPanelService } from '../services/prism-panel.service.js';
import { PrismPluginService } from '../services/prism-plugin.service.js';
import { PrismRendererService } from '../services/prism-renderer.service.js';
import { PrismCanvasService } from '../services/prism-canvas.service.js';
import { PrismCaptureService } from '../services/prism-capture.service.js';
import { PrismVariantBgService } from '../services/prism-variant-bg.service.js';
import { PrismCanvasRulersComponent } from '../canvas/prism-canvas-rulers.component.js';
import { PrismCanvasBgPillComponent } from '../canvas/prism-canvas-bg-pill.component.js';
import { CANVAS_BG_STYLES } from '../canvas/canvas-bg.styles.js';
import { buildKnownInputs } from './known-inputs.js';
import { resolveOverlay } from './overlay-resolver.js';
import { parseContentToNodes } from './projectable-content.js';

@Component({
  selector: 'prism-renderer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PrismCanvasRulersComponent,
    PrismCanvasBgPillComponent,
    NgComponentOutlet,
  ],
  templateUrl: './prism-renderer.component.html',
  styleUrl: './prism-renderer.component.css',
  styles: [CANVAS_BG_STYLES],
})
export class PrismRendererComponent {
  protected readonly navigationService = inject(PrismNavigationService);
  protected readonly rendererService = inject(PrismRendererService);
  protected readonly canvasService = inject(PrismCanvasService);
  protected readonly capture = inject(PrismCaptureService);
  protected readonly variantBg = inject(PrismVariantBgService);
  private readonly eventLogService = inject(PrismEventLogService);
  private readonly manifestService = inject(PrismManifestService);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly rendererHooks = inject(PRISM_RENDERER_HOOKS, {
    optional: true,
  });

  private readonly panelService = inject(PrismPanelService);
  private readonly pluginService = inject(PrismPluginService);

  private readonly outlet = viewChild.required('outlet', {
    read: ViewContainerRef,
  });
  private componentRef: ComponentRef<unknown> | null = null;
  private outputSubscriptions: Array<{ unsubscribe(): void }> = [];
  private lastProjectedContent: string | Record<string, string> | undefined =
    undefined;
  private isRenderPage = false;

  private readonly overlayCache = new Map<string, Type<unknown>>();
  readonly activeOverlay = signal<Type<unknown> | null>(null);
  /** Identifier of the currently rendered component/variant (for audit tooling / e2e). */
  protected readonly renderedKey = computed(() => {
    const el = this.rendererService.renderedElement();
    if (!el) return null;
    const comp = this.navigationService.activeComponent();
    if (!comp) return null;
    return `${
      comp.meta.className
    }:${this.rendererService.activeVariantIndex()}`;
  });
  /** Resolved canvas layout for the active variant — variant overrides component config; defaults to 'fit'. */
  protected readonly canvasLayout = computed(() => {
    const comp = this.navigationService.activeComponent();
    if (!comp) return 'fit';
    const variant =
      comp.meta.showcaseConfig.variants?.[
        this.rendererService.activeVariantIndex()
      ];
    return (
      variant?.canvasLayout ?? comp.meta.showcaseConfig.canvasLayout ?? 'fit'
    );
  });
  protected readonly overlayInputs = { rendererService: this.rendererService };
  protected readonly overlayInjector = computed(() => {
    const panelInjector = this.panelService.activePanelInjector();
    return panelInjector ?? this.injector;
  });

  constructor() {
    effect(() => {
      const comp = this.navigationService.activeComponent();
      if (!comp) return;
      untracked(() => {
        this.host.nativeElement.scrollTop = 0;
        this.rendererService.reconcileForComponent(comp);
        this.createComponent(comp);
      });
    });

    effect(() => {
      const inputs = this.rendererService.inputValues();
      const content = this.rendererService.activeContent();
      const ref = this.componentRef;
      if (!ref) return;

      if (this.isRenderPage) {
        ref.changeDetectorRef.detectChanges();
        return;
      }

      const comp = untracked(() => this.navigationService.activeComponent());
      if (!comp) return;

      if (content !== this.lastProjectedContent) {
        untracked(() => this.createComponent(comp));
        return;
      }

      performance.mark('prism:rerender:start');
      const knownInputs = buildKnownInputs(comp);
      for (const [key, value] of Object.entries(inputs)) {
        if (!knownInputs.has(key)) {
          console.warn(
            `[ng-prism] Unknown input "${key}" on <${comp.meta.componentMeta.selector}> — skipping. Remove it from @Showcase variants.`
          );
          continue;
        }
        ref.setInput(key, value);
      }
      ref.changeDetectorRef.detectChanges();
      performance.mark('prism:rerender:end');
      performance.measure(
        'prism:rerender',
        'prism:rerender:start',
        'prism:rerender:end'
      );
    });

    effect(() => {
      const panelId = this.panelService.activePanelId();
      const allPanels: PanelDefinition[] = [
        ...BUILTIN_PANELS,
        ...this.pluginService.panels(),
      ];
      const resolution = resolveOverlay(allPanels, panelId, {
        captureActive: this.capture.active(),
        cache: this.overlayCache,
      });

      if (resolution.kind === 'eager') {
        this.activeOverlay.set(resolution.component);
        return;
      }

      this.activeOverlay.set(null);
      if (resolution.kind !== 'lazy') return;

      const { panelId: requestedPanelId, load } = resolution;
      load().then((c) => {
        this.overlayCache.set(requestedPanelId, c);
        if (this.panelService.activePanelId() === requestedPanelId) {
          this.activeOverlay.set(c);
        }
      });
    });

    this.destroyRef.onDestroy(() => this.cleanup());
  }

  private createComponent(comp: RuntimeComponent): void {
    this.cleanup();

    const renderPageTitle = comp.meta.showcaseConfig.renderPage;
    if (renderPageTitle) {
      const page = this.manifestService
        .manifest()
        .pages?.find(
          (p): p is ComponentPage =>
            p.type === 'component' && p.title === renderPageTitle
        );
      if (page) {
        this.isRenderPage = true;
        const injector = Injector.create({
          providers: comp.meta.showcaseConfig.providers ?? [],
          parent: this.injector,
        });
        this.componentRef = this.outlet().createComponent(page.component, {
          injector,
        });
        this.componentRef.changeDetectorRef.detectChanges();
        this.rendererService.renderedElement.set(
          this.componentRef.location.nativeElement
        );
        return;
      }
    }

    this.isRenderPage = false;
    const selector = comp.meta.componentMeta.selector;
    const detail = { detail: { selector } };

    this.rendererHooks?.onBeforeCreate?.(selector);
    performance.mark('prism:render:start', detail);

    const injector = Injector.create({
      providers: comp.meta.showcaseConfig.providers ?? [],
      parent: this.injector,
    });

    const content = this.rendererService.activeContent();
    this.lastProjectedContent = content;
    const projectableNodes = content ? parseContentToNodes(content) : undefined;

    this.componentRef = this.outlet().createComponent(comp.type, {
      injector,
      projectableNodes,
    });

    for (const output of comp.meta.outputs) {
      const emitter = (this.componentRef.instance as Record<string, unknown>)[
        output.name
      ];
      if (
        emitter &&
        typeof (emitter as { subscribe?: unknown }).subscribe === 'function'
      ) {
        const sub = (
          emitter as {
            subscribe(fn: (v: unknown) => void): { unsubscribe(): void };
          }
        ).subscribe((v: unknown) => this.eventLogService.log(output.name, v));
        this.outputSubscriptions.push(sub);
      }
    }

    const knownInputs = buildKnownInputs(comp);
    for (const [key, value] of Object.entries(
      this.rendererService.inputValues()
    )) {
      if (!knownInputs.has(key)) {
        console.warn(
          `[ng-prism] Unknown input "${key}" on <${selector}> — skipping. Remove it from @Showcase variants.`
        );
        continue;
      }
      this.componentRef.setInput(key, value);
    }
    this.componentRef.changeDetectorRef.detectChanges();

    performance.mark('prism:render:end', detail);
    performance.measure(
      'prism:render',
      'prism:render:start',
      'prism:render:end'
    );

    this.rendererService.renderedElement.set(
      this.componentRef.location.nativeElement
    );
    this.rendererHooks?.onAfterCreate?.(selector);
  }

  private cleanup(): void {
    const hadComponent = this.componentRef !== null;
    this.rendererService.renderedElement.set(null);
    for (const sub of this.outputSubscriptions) {
      sub.unsubscribe();
    }
    this.outputSubscriptions = [];
    this.outlet().clear();
    this.componentRef = null;
    this.lastProjectedContent = undefined;
    if (hadComponent) {
      this.rendererHooks?.onAfterDestroy?.('');
    }
  }
}
