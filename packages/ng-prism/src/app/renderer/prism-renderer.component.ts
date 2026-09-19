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
import { buildKnownInputs } from './known-inputs.js';
import { resolveOverlay } from './overlay-resolver.js';

@Component({
  selector: 'prism-renderer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PrismCanvasRulersComponent,
    PrismCanvasBgPillComponent,
    NgComponentOutlet,
  ],
  template: `
    <div
      class="prism-canvas-stage"
      [attr.data-bg]="variantBg.effective()"
      [attr.data-rulers]="canvasService.rulers() ? '' : null"
    >
      @if (!capture.active()) {
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
      <prism-canvas-bg-pill />
      }

      <div
        class="demo-wrap"
        [style.--zoom]="canvasService.zoom()"
        [attr.data-prism-rendered]="renderedKey()"
        [attr.data-canvas-layout]="canvasLayout()"
      >
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
      background-color: var(--prism-stage);

      /* The edge is outline + shadow, never border and never extra padding.
         plugin-visual-regression screenshots .demo-wrap, which is centred in
         this element; a border would shrink the content box by 2px and move
         that centre, shifting all 15 baselines in test-workspace/vrt/baseline
         without a single component having changed. Capture mode resets this
         element's padding but not its border, and this repo has no VRT runner
         to catch the drift. outline and box-shadow do not participate in
         layout, so the box is provably unchanged. Keep it that way. */
      outline: 1px solid var(--prism-stage-edge);
      outline-offset: -1px;
      box-shadow:
        0 1px 3px rgba(0, 0, 0, 0.10),
        0 8px 24px -12px rgba(0, 0, 0, 0.18);
      background-image: radial-gradient(circle, var(--prism-dot) 1px, transparent 1px);
      background-size: 20px 20px;
      transition: filter var(--dur-base);
      --prism-canvas-overlay-top: 12px;
      --prism-canvas-overlay-inline: 20px;
    }
    .prism-canvas-stage[data-rulers] {
      --prism-canvas-overlay-top: 28px;
      --prism-canvas-overlay-inline: 28px;
    }

    .prism-canvas-stage[data-bg="plain"] {
      background-image: none;
    }
    /* Flat, not dotted. "light" and "dark" name a surface a component was
       designed against — and they are the two backgrounds whose colour is
       absolute rather than a theme token, which is what makes them the values
       to declare for a screenshot baseline. "dots" already exists for anyone
       who wants the grid. */
    .prism-canvas-stage[data-bg="light"] {
      background-color: var(--prism-void-light, #f7f5fc);
      background-image: none;
    }
    .prism-canvas-stage[data-bg="dark"] {
      background-color: var(--prism-void-dark, #07050f);
      background-image: none;
    }
    /* "transparent" shares the checkerboard on purpose. The two say the same
       thing in the two media the canvas has: while browsing, the checkerboard
       is already the UI's word for "no surface here"; in a capture it becomes
       literal transparency. A stage that were really see-through in the app
       would just show the shell through the canvas, which means nothing. The
       split between the two lives entirely in CAPTURE_STYLES. */
    .prism-canvas-stage[data-bg="checker"],
    .prism-canvas-stage[data-bg="transparent"] {
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
      top: var(--prism-canvas-overlay-top);
      left: var(--prism-canvas-overlay-inline);
      display: flex;
      gap: 6px;
      pointer-events: none;
      transition: top var(--dur-base), left var(--dur-base);
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
      display: inline-block;
      transform: scale(var(--zoom, 1));
      transition: transform 0.18s;
    }
    .demo-wrap[data-canvas-layout="stretch"] {
      display: block;
      width: 100%;
      max-width: 800px;
    }

  `,
})
export class PrismRendererComponent {
  protected readonly Math = Math;
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

// SAFETY: `content` originates from `@Showcase({ variants: [{ content }] })`
// in developer-authored source code. It is trusted by ng-prism's threat model
// (see SECURITY.md). Sanitization would strip the Angular component/directive
// selectors that variant content is meant to project.
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
    // SAFETY: trusted developer-authored HTML — see SECURITY.md.
    wrapper.innerHTML = html;
    const nodes: Node[] = [];
    for (const child of Array.from(wrapper.childNodes)) {
      const el = document.createElement('div');
      // SAFETY: trusted developer-authored HTML — see SECURITY.md.
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

// SAFETY: see `parseContentToNodes` above and SECURITY.md — `html` is trusted
// developer-authored variant content from the `@Showcase` decorator.
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
