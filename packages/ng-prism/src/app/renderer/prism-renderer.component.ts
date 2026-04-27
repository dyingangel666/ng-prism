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
import { PrismCanvasRulersComponent } from '../canvas/prism-canvas-rulers.component.js';

@Component({
  selector: 'prism-renderer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrismCanvasRulersComponent, NgComponentOutlet],
  template: `
    <div class="prism-canvas-stage" [attr.data-bg]="canvasService.bg()">
      <div class="canvas-badges">
        <span class="c-badge"
          >{{ Math.round(canvasService.zoom() * 100) }}%</span
        >
      </div>
      <div
        class="stage-crosshair"
        [class.visible]="canvasService.guides()"
      ></div>
      <prism-canvas-rulers />

      <div class="demo-wrap" [style.--zoom]="canvasService.zoom()">
        <ng-container #outlet />
        @if (activeOverlay()) {
        <ng-container
          *ngComponentOutlet="
            activeOverlay()!;
            inputs: overlayInputs;
            injector: overlayInjector()
          "
        />
        }
      </div>
    </div>
  `,
  styles: `
    :host { display: block; min-height: 0; flex: 1; }

    .prism-canvas-stage {
      position: relative;
      overflow: auto;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 32px;
      min-height: 200px;
      height: 100%;
      background-color: var(--prism-bg-surface);
      background-image: radial-gradient(circle, var(--prism-dot) 1px, transparent 1px);
      background-size: 20px 20px;
      transition: filter var(--dur-base);
    }

    .prism-canvas-stage[data-bg="plain"] {
      background-image: none;
    }
    .prism-canvas-stage[data-bg="light"] {
      background-color: #f7f5fc;
      background-image: radial-gradient(circle, rgba(124, 58, 237, 0.15) 1px, transparent 1px);
    }
    .prism-canvas-stage[data-bg="dark"] {
      background-color: #07050f;
      background-image: radial-gradient(circle, rgba(167, 139, 250, 0.18) 1px, transparent 1px);
    }
    .prism-canvas-stage[data-bg="checker"] {
      background-image:
        linear-gradient(45deg, var(--prism-border) 25%, transparent 25%),
        linear-gradient(-45deg, var(--prism-border) 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, var(--prism-border) 75%),
        linear-gradient(-45deg, transparent 75%, var(--prism-border) 75%);
      background-size: 16px 16px;
      background-position: 0 0, 0 8px, 8px -8px, -8px 0;
    }

    .stage-crosshair {
      position: absolute;
      inset: 0;
      pointer-events: none;
      opacity: 0;
      transition: opacity var(--dur-base);
    }
    .stage-crosshair.visible { opacity: 1; }
    .stage-crosshair::before,
    .stage-crosshair::after {
      content: '';
      position: absolute;
      background: color-mix(in srgb, var(--prism-primary) 20%, transparent);
    }
    .stage-crosshair::before { left: 0; right: 0; top: 50%; height: 1px; }
    .stage-crosshair::after { top: 0; bottom: 0; left: 50%; width: 1px; }

    .canvas-badges {
      position: absolute;
      top: 12px;
      left: 20px;
      display: flex;
      gap: 6px;
      pointer-events: none;
    }
    .c-badge {
      font-family: var(--font-mono);
      font-size: var(--fs-xs);
      padding: 3px 7px;
      border-radius: 4px;
      background: color-mix(in srgb, var(--prism-bg-elevated) 90%, transparent);
      border: 1px solid var(--prism-border);
      color: var(--prism-text-muted);
      backdrop-filter: blur(8px);
    }

    .demo-wrap {
      position: relative;
      transform: scale(var(--zoom, 1));
      transition: transform 0.18s;
    }

  `,
})
export class PrismRendererComponent {
  protected readonly Math = Math;
  protected readonly navigationService = inject(PrismNavigationService);
  protected readonly rendererService = inject(PrismRendererService);
  protected readonly canvasService = inject(PrismCanvasService);
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
      const knownInputs = new Set(comp.meta.inputs.map((i) => i.name));
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
      const panel = allPanels.find((p) => p.id === panelId) ?? null;

      if (!panel) {
        this.activeOverlay.set(null);
        return;
      }
      if (panel.overlayComponent) {
        this.activeOverlay.set(panel.overlayComponent);
        return;
      }
      if (panel.loadOverlayComponent) {
        const cached = this.overlayCache.get(panel.id);
        if (cached) {
          this.activeOverlay.set(cached);
          return;
        }
        this.activeOverlay.set(null);
        panel.loadOverlayComponent().then((c) => {
          this.overlayCache.set(panel.id, c);
          this.activeOverlay.set(c);
        });
        return;
      }
      this.activeOverlay.set(null);
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

    const knownInputs = new Set(comp.meta.inputs.map((i) => i.name));
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

function parseContentToNodes(
  content: string | Record<string, string>
): Node[][] {
  if (typeof content === 'string') {
    return [htmlToNodes(content)];
  }

  const defaultNodes = content['default']
    ? htmlToNodes(content['default'])
    : [];
  const result: Node[][] = [defaultNodes];

  for (const [selector, html] of Object.entries(content)) {
    if (selector === 'default') continue;
    const wrapper = document.createElement('div');
    wrapper.innerHTML = html;
    const nodes: Node[] = [];
    for (const child of Array.from(wrapper.childNodes)) {
      const el = document.createElement('div');
      el.innerHTML = (child as Element).outerHTML ?? child.textContent ?? '';
      const projected = el.firstChild;
      if (projected && projected instanceof Element) {
        applySelector(projected, selector);
        nodes.push(projected);
      } else if (projected) {
        const span = document.createElement('span');
        applySelector(span, selector);
        span.textContent = child.textContent;
        nodes.push(span);
      }
    }
    result.push(nodes);
  }

  return result;
}

function htmlToNodes(html: string): Node[] {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = html;
  return Array.from(wrapper.childNodes);
}

function applySelector(el: Element, selector: string): void {
  const attrMatch = selector.match(/^\[([^\]=]+)]$/);
  if (attrMatch) {
    el.setAttribute(attrMatch[1], '');
  }
}
