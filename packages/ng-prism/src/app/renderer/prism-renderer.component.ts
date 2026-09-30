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
import { PrismResizerDirective } from '../directives/prism-resizer.directive.js';
import { snapViewportWidth } from '../canvas/viewport-snap.js';
import { VIEWPORT_MAX, VIEWPORT_MIN } from '../../shared/viewport.type.js';
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
    PrismResizerDirective,
  ],
  template: `
    <div
      class="prism-canvas-stage"
      [attr.data-bg]="variantBg.effective()"
      [attr.data-rulers]="canvasService.rulers() ? '' : null"
      [attr.data-viewport]="canvasService.viewportWidth() !== null ? '' : null"
      [style.--prism-vp-w.px]="canvasService.viewportWidth()"
      [style.--zoom]="canvasService.zoom()"
    >
      @if (!capture.active()) {
      <div
        class="stage-crosshair"
        [class.visible]="canvasService.guides()"
      ></div>
      <prism-canvas-rulers />
      <prism-canvas-bg-pill />
      @if (canvasService.viewportWidth() !== null) {
      <!-- Grips and the dimension line are siblings of .demo-wrap, never
           children of it: .demo-wrap is what plugin-visual-regression
           screenshots, and anything inside it composites into every baseline.
           They sit inside the capture guard for the same reason the rulers and
           the pill do. -->
      <span class="vp-dim">
        <span class="vp-dim__rule"></span>
        <span class="vp-dim__v">{{ canvasService.viewportWidth() }} px</span>
        <span class="vp-dim__rule"></span>
      </span>
      <div
        class="vp-grip"
        prismResizer
        axis="x"
        [scale]="-2 / (canvasService.zoom() || 1)"
        [min]="VIEWPORT_MIN"
        [max]="VIEWPORT_MAX"
        [value]="canvasService.viewportWidth()!"
        (valueChange)="onViewportResize($event)"
        aria-label="Viewport width, left edge"
        [attr.aria-valuenow]="canvasService.viewportWidth()"
        [attr.aria-valuemin]="VIEWPORT_MIN"
        [attr.aria-valuemax]="VIEWPORT_MAX"
      ></div>
      <div
        class="vp-grip vp-grip--end"
        prismResizer
        axis="x"
        [scale]="2 / (canvasService.zoom() || 1)"
        [min]="VIEWPORT_MIN"
        [max]="VIEWPORT_MAX"
        [value]="canvasService.viewportWidth()!"
        (valueChange)="onViewportResize($event)"
        aria-label="Viewport width, right edge"
        [attr.aria-valuenow]="canvasService.viewportWidth()"
        [attr.aria-valuemin]="VIEWPORT_MIN"
        [attr.aria-valuemax]="VIEWPORT_MAX"
      ></div>
      } }

      <div
        class="demo-wrap"
        [style.--zoom]="canvasService.zoom()"
        [attr.data-prism-rendered]="renderedKey()"
        [attr.data-canvas-layout]="canvasLayout()"
        [attr.data-viewport]="
          canvasService.viewportWidth() !== null ? '' : null
        "
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
  styles: [
    `
      :host {
        display: block;
        min-height: 0;
        flex: 1;
      }

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
         layout, so the box is provably unchanged. Keep it that way.
         They do still paint, and outline-offset is negative, so the line lands
         inside the box: CAPTURE_STYLES in prism-capture.service.ts sets both
         to none, which is only safe because neither is load-bearing here. */
        outline: 1px solid var(--prism-stage-edge);
        outline-offset: -1px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1),
          0 8px 24px -12px rgba(0, 0, 0, 0.18);
        transition: filter var(--dur-base);
        --prism-canvas-overlay-top: 12px;
        --prism-canvas-overlay-inline: 20px;
      }
      .prism-canvas-stage[data-rulers] {
        --prism-canvas-overlay-top: 28px;
        --prism-canvas-overlay-inline: 28px;
      }

      .stage-crosshair {
        position: absolute;
        inset: 0;
        pointer-events: none;
        opacity: 0;
        transition: opacity var(--dur-base);
      }
      .stage-crosshair.visible {
        opacity: 1;
      }
      .stage-crosshair::before,
      .stage-crosshair::after {
        content: '';
        position: absolute;
        background: color-mix(in srgb, var(--prism-primary) 20%, transparent);
      }
      .stage-crosshair::before {
        left: 0;
        right: 0;
        top: 50%;
        height: 1px;
      }
      .stage-crosshair::after {
        top: 0;
        bottom: 0;
        left: 50%;
        width: 1px;
      }

      .demo-wrap {
        position: relative;
        display: inline-block;
        transform: scale(var(--zoom, 1));
        transition: transform 0.18s;
      }
      .demo-wrap[data-canvas-layout='stretch'] {
        display: block;
        width: 100%;
        max-width: 800px;
      }

      /* max-width: none rather than min(800px, var(--prism-vp-w)): an explicitly
         requested width beats a layout default, and min() would silently cap a
         1024 viewport at 800 on any component declaring canvasLayout:
         'stretch'.

         container-type is confined to this rule, and that confinement is
         load-bearing. It implies contain: inline-size, which on the width:auto
         inline-block .demo-wrap is at rest would decouple its width from its
         contents — collapsing the box and shifting every baseline in
         test-workspace/vrt/baseline without a component having changed. Here
         the width is explicit, so containment costs nothing and is what makes
         a component's own @container rules respond. Media queries do not and
         cannot: they read the real browser viewport.

         grid + justify-items: center, and not text-align: center, which is the
         obvious way to centre an inline-level child and the wrong one. The
         showcase component is created through ViewContainerRef, so its host
         element carries none of this component's _ngcontent attribute and no
         scoped rule here can reach it to undo an inherited value. text-align
         would therefore leak all the way into the specimen and silently
         re-align its own text the moment the viewport is switched on — a
         canvas that lies about what it is showing. Centring at the container
         instead touches nothing inside.

         Shrinking is not a side effect of that choice, it is the resting
         behaviour preserved: at rest .demo-wrap is an inline-block that
         already shrink-wraps its child, so a block-level specimen sizes to its
         content here exactly as it does with the constraint off. The implicit
         auto column still fills the declared width, so a component that asks
         for width: 100% — the canvasLayout: 'stretch' case — keeps getting the
         whole viewport. */
      .demo-wrap[data-viewport] {
        display: grid;
        justify-items: center;
        /* flex: none, and it is load-bearing. The stage is a flex container
           and this is its only item, so the default flex-shrink: 1 lets the
           box render narrower than the width just asked for whenever the
           canvas is the smaller of the two — and container-type below drops
           the automatic minimum size to zero, so nothing stops the shrink.
           The result is the one failure this whole feature cannot afford:
           the dimension line states 1024 while every @container rule in the
           specimen answers whatever the canvas happened to allow. The stage
           is overflow: auto, so refusing to shrink scrolls instead. */
        flex: none;
        width: var(--prism-vp-w);
        max-width: none;
        container-type: inline-size;
      }

      /* Both grips derive their position arithmetically, because .demo-wrap is
         centred by the stage's own flexbox and then scaled in place by
         transform: scale(var(--zoom)): the transform preserves that centre, so
         each edge sits half the *painted* width — --prism-vp-w times --zoom — away
         from the middle. No measurement, no ResizeObserver, and nothing to
         fall out of step when either the width or the zoom changes.

         The grip's own [scale] input (in the template) undoes the same factor
         in the other direction: a pointer that has moved dx across the painted
         box must change --prism-vp-w by dx / zoom for the grip to stay under the
         cursor, so the directive multiplier is 2 / zoom on the right grip and
         -2 / zoom on the left, not the flat ±2 a permanent zoom of 1 would
         need. */
      .vp-grip {
        position: absolute;
        top: var(--prism-canvas-overlay-top, 12px);
        bottom: 0;
        z-index: 4;
        width: 9px;
        left: calc(50% - var(--prism-vp-w) * var(--zoom, 1) / 2 - 4.5px);
        display: grid;
        background: transparent;
      }
      .vp-grip--end {
        left: auto;
        right: calc(50% - var(--prism-vp-w) * var(--zoom, 1) / 2 - 4.5px);
      }

      /* Handle and guide line occupy the same grid cell — hence the identical
         grid-area: 1 / 1 in both — so the line runs the full height of the
         stage while the handle stays centred on it. Written out per rule
         rather than grouped into a shared selector on purpose: the guards in
         viewport-css.spec.ts slice a rule by searching for the text that opens
         it, and grouping the two pseudo-elements into one selector makes that
         search ambiguous for whichever of them it names last. Each rule reads
         completely here, and each is addressable there.

         The handle is the part you grab, raised above the line so the 1px rule
         does not paint a seam down the middle of the 3px bar. */
      .vp-grip::before {
        content: '';
        grid-area: 1 / 1;
        justify-self: center;
        z-index: 1;
        align-self: center;
        width: 3px;
        height: 34px;
        border-radius: 2px;
        background: color-mix(in srgb, var(--prism-measure) 80%, transparent);
        transition: background var(--dur-fast);
      }

      /* The edge itself, carried the whole height of the stage. Without it a
         grip is a floating nub that says where you may pull but not what it is
         pulling: the line is what makes the constrained region legible as a
         region rather than as two loose handles. Faint on purpose — it crosses
         the specimen, so it has to stay readable as chrome. */
      .vp-grip::after {
        content: '';
        grid-area: 1 / 1;
        justify-self: center;
        align-self: stretch;
        width: 1px;
        background: color-mix(in srgb, var(--prism-measure) 75%, transparent);
        transition: background var(--dur-fast);
      }
      .vp-grip:hover::after,
      .vp-grip.active::after,
      .vp-grip:focus-visible::after {
        background: color-mix(in srgb, var(--prism-measure) 55%, transparent);
      }
      .vp-grip:hover::before,
      .vp-grip.active::before,
      .vp-grip:focus-visible::before {
        background: var(--prism-measure);
      }
      .vp-grip:focus-visible {
        outline: 2px solid var(--prism-primary);
        outline-offset: -2px;
      }

      /* The third resident of the overlay band: pill left, dimension centre,
         rail right. It reads the same --prism-canvas-overlay-top the other two
         do, so switching rulers on moves all three together.

         Spans the painted width rather than sitting in the middle of it as a
         badge, and carries the same --prism-vp-w * --zoom the grips do so the
         three stay locked together. A badge states a number; a dimension line
         states which distance the number measures, and that is the whole
         claim this overlay makes. */
      .vp-dim {
        position: absolute;
        top: var(--prism-canvas-overlay-top, 12px);
        left: 50%;
        width: calc(var(--prism-vp-w) * var(--zoom, 1));
        transform: translateX(-50%);
        z-index: 4;
        display: flex;
        align-items: center;
        gap: var(--sp-3);
        pointer-events: none;
      }

      /* Two halves with the value in the gap, rather than one rule behind it:
         a line running under the digits would need a background plate to stay
         readable, and the plate is the badge this replaced. */
      .vp-dim__rule {
        position: relative;
        flex: 1;
        height: 1px;
        background: color-mix(in srgb, var(--prism-measure) 70%, transparent);
      }

      /* The end ticks. They are what make the rule read as a measurement of
         the span between them instead of as a divider laid across the canvas,
         and they mark the two edges the grips can be dragged to. */
      .vp-dim__rule::before {
        content: '';
        position: absolute;
        top: -3px;
        width: 1px;
        height: 7px;
        background: color-mix(in srgb, var(--prism-measure) 90%, transparent);
      }
      .vp-dim__rule:first-child::before {
        left: 0;
      }
      .vp-dim__rule:last-child::before {
        right: 0;
      }

      .vp-dim__v {
        flex: none;
        font-family: var(--font-mono);
        font-size: 9px;
        color: var(--prism-measure);
        white-space: nowrap;
      }
    `,
    CANVAS_BG_STYLES,
  ],
})
export class PrismRendererComponent {
  protected readonly navigationService = inject(PrismNavigationService);
  protected readonly rendererService = inject(PrismRendererService);
  protected readonly canvasService = inject(PrismCanvasService);
  protected readonly capture = inject(PrismCaptureService);
  protected readonly variantBg = inject(PrismVariantBgService);
  protected readonly VIEWPORT_MIN = VIEWPORT_MIN;
  protected readonly VIEWPORT_MAX = VIEWPORT_MAX;

  /**
   * A drag on either grip, rested on a preset if it came close enough.
   *
   * The snapping lives here and not in `PrismResizerDirective` on purpose: the
   * directive also drives the sidebar and the panel, where there is nothing to
   * snap to, and a generic control that knows about viewport presets would be
   * the wrong shape.
   */
  protected onViewportResize(width: number): void {
    this.canvasService.setViewportWidth(snapViewportWidth(width));
  }

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
