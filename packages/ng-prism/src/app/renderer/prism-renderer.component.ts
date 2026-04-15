import {
  Component,
  type ComponentRef,
  computed,
  DestroyRef,
  effect,
  inject,
  Injector,
  signal,
  type Type,
  untracked,
  viewChild,
  ViewContainerRef,
} from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { Highlight } from 'ngx-highlightjs';
import type { PanelDefinition, RuntimeComponent } from '../../plugin/plugin.types.js';
import { BUILTIN_PANELS } from '../panels/builtin-panels.js';
import { A11yPerspectiveService } from '../panels/a11y/a11y-perspective.service.js';
import { PRISM_RENDERER_HOOKS } from '../tokens/prism-tokens.js';

import { PrismEventLogService } from '../services/prism-event-log.service.js';
import { PrismNavigationService } from '../services/prism-navigation.service.js';
import { PrismPanelService } from '../services/prism-panel.service.js';
import { PrismPluginService } from '../services/prism-plugin.service.js';
import { PrismRendererService } from '../services/prism-renderer.service.js';
import { generateSnippet } from './snippet-generator.js';

@Component({
  selector: 'prism-renderer',
  standalone: true,
  imports: [Highlight, NgComponentOutlet],
  template: `
    <div class="prism-renderer">
      @if (navigationService.activeComponent(); as comp) {
        @if (comp.meta.showcaseConfig.variants?.length) {
          <div class="prism-renderer__toolbar">
            @for (variant of comp.meta.showcaseConfig.variants!; track variant.name; let i = $index) {
              <button
                class="prism-renderer__variant"
                [class.prism-renderer__variant--active]="rendererService.activeVariantIndex() === i"
                (click)="rendererService.selectVariant(i)"
              >
                {{ variant.name }}
              </button>
            }
          </div>
        }
      }
      <div class="prism-renderer__canvas" [class.prism-renderer__canvas--sr]="perspectiveService.mode() === 'screen-reader'">
        <ng-container #outlet />
        @if (activeOverlay()) {
          <ng-container *ngComponentOutlet="activeOverlay()!" />
        }
      </div>
      @if (snippet()) {
        <div class="prism-renderer__code-bar">
          <button
            class="prism-renderer__code-button"
            [class.prism-renderer__code-button--active]="codeVisible()"
            (click)="codeVisible.set(!codeVisible())"
          >
            &lt;/&gt; Code
          </button>
        </div>
      }
      @if (codeVisible()) {
        <div class="prism-renderer__code">
          <pre><code [highlight]="snippet()" language="xml"></code></pre>
        </div>
      }
    </div>
  `,
  styles: `
    .prism-renderer {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
    }

    .prism-renderer__toolbar {
      display: flex;
      align-items: center;
      padding: 0 8px;
      border-bottom: 1px solid var(--prism-border);
      flex-shrink: 0;
      background: var(--prism-bg-elevated);
    }
    .prism-renderer__variant {
      padding: 8px 14px;
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
    .prism-renderer__variant::after {
      content: '';
      position: absolute;
      bottom: 0; left: 0; right: 0;
      height: 2px;
      background: linear-gradient(90deg, var(--prism-primary-from), var(--prism-primary-to));
      opacity: 0;
      transition: opacity 0.12s;
    }
    .prism-renderer__variant:hover { color: var(--prism-text); }
    .prism-renderer__variant--active { color: var(--prism-primary); }
    .prism-renderer__variant--active::after { opacity: 1; }

    .prism-renderer__canvas {
      position: relative;
      flex: 1;
      padding: 48px 40px;
      overflow: auto;
      background-color: var(--prism-bg-surface);
      background-image: radial-gradient(
        circle,
        color-mix(in srgb, var(--prism-primary) 15%, transparent) 1px,
        transparent 1px
      );
      background-size: 20px 20px;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      transition: filter 0.2s;
    }
    .prism-renderer__canvas--sr {
      filter: brightness(0.82) saturate(0.7);
    }

    .prism-renderer__code-bar {
      display: flex;
      align-items: center;
      padding: 0 12px;
      border-top: 1px solid var(--prism-border);
      flex-shrink: 0;
      background: var(--prism-bg-elevated);
    }
    .prism-renderer__code-button {
      display: flex;
      align-items: center;
      gap: 5px;
      padding: 6px 8px;
      font-size: 11.5px;
      font-family: var(--prism-font-mono, monospace);
      border: none;
      background: none;
      color: var(--prism-text-muted);
      cursor: pointer;
      position: relative;
      transition: color 0.12s;
      margin-bottom: -1px;
    }
    .prism-renderer__code-button::after {
      content: '';
      position: absolute;
      bottom: 0; left: 4px; right: 4px;
      height: 2px;
      background: linear-gradient(90deg, var(--prism-primary-from), var(--prism-primary-to));
      opacity: 0;
      transition: opacity 0.12s;
    }
    .prism-renderer__code-button:hover { color: var(--prism-text-2); }
    .prism-renderer__code-button--active { color: var(--prism-primary); }
    .prism-renderer__code-button--active::after { opacity: 1; }

    .prism-renderer__code {
      border-top: 1px solid var(--prism-border);
      overflow: auto;
      flex-shrink: 0;
      max-height: 240px;
      background: var(--prism-void);
    }
    .prism-renderer__code pre {
      margin: 0;
      padding: 20px 24px;
      font-size: 12.5px;
      line-height: 1.65;
      font-family: var(--prism-font-mono);
    }
    .prism-renderer__code code { font-family: inherit; }
    :host ::ng-deep .prism-renderer__code .hljs {
      background: transparent;
      color: var(--prism-text-2);
    }
    :host ::ng-deep .prism-renderer__code .hljs-tag { color: var(--prism-text-muted); }
    :host ::ng-deep .prism-renderer__code .hljs-name { color: var(--prism-primary); }
    :host ::ng-deep .prism-renderer__code .hljs-attr { color: #93c5fd; }
    :host ::ng-deep .prism-renderer__code .hljs-string { color: #7dd3fc; }
  `,
})
export class PrismRendererComponent {
  protected readonly navigationService = inject(PrismNavigationService);
  protected readonly rendererService = inject(PrismRendererService);
  protected readonly perspectiveService = inject(A11yPerspectiveService);
  private readonly eventLogService = inject(PrismEventLogService);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);
  private readonly rendererHooks = inject(PRISM_RENDERER_HOOKS, { optional: true });

  private readonly outlet = viewChild.required('outlet', { read: ViewContainerRef });
  private componentRef: ComponentRef<unknown> | null = null;
  private outputSubscriptions: Array<{ unsubscribe(): void }> = [];
  private lastProjectedContent: string | Record<string, string> | undefined = undefined;
  private readonly panelService = inject(PrismPanelService);
  private readonly pluginService = inject(PrismPluginService);
  private readonly overlayCache = new Map<string, Type<unknown>>();
  readonly activeOverlay = signal<Type<unknown> | null>(null);

  readonly codeVisible = signal(false);

  readonly snippet = computed(() => {
    const comp = this.navigationService.activeComponent();
    if (!comp) return '';
    const variant = comp.meta.showcaseConfig.variants?.[this.rendererService.activeVariantIndex()];
    const explicitKeys = variant?.inputs ? new Set(Object.keys(variant.inputs)) : undefined;
    const directiveOptions = comp.meta.componentMeta.isDirective
      ? { host: comp.meta.showcaseConfig.host }
      : undefined;
    return generateSnippet(
      comp.meta.componentMeta.selector,
      comp.meta.inputs,
      this.rendererService.inputValues(),
      explicitKeys,
      this.rendererService.activeContent(),
      directiveOptions,
    );
  });

  constructor() {
    effect(() => {
      const comp = this.navigationService.activeComponent();
      if (!comp) return;
      untracked(() => {
        this.codeVisible.set(false);
        this.rendererService.resetForComponent(comp);
        this.createComponent(comp);
      });
    });

    effect(() => {
      const inputs = this.rendererService.inputValues();
      const content = this.rendererService.activeContent();
      const ref = this.componentRef;
      if (!ref) return;

      const comp = untracked(() => this.navigationService.activeComponent());
      if (!comp) return;

      if (content !== this.lastProjectedContent) {
        untracked(() => this.createComponent(comp));
        return;
      }

      performance.mark('prism:rerender:start');
      for (const [key, value] of Object.entries(inputs)) {
        ref.setInput(key, value);
      }
      ref.changeDetectorRef.detectChanges();
      performance.mark('prism:rerender:end');
      performance.measure('prism:rerender', 'prism:rerender:start', 'prism:rerender:end');
    });

    effect(() => {
      const panelId = this.panelService.activePanelId();
      const allPanels: PanelDefinition[] = [...BUILTIN_PANELS, ...this.pluginService.panels()];
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
        panel.loadOverlayComponent().then((comp) => {
          this.overlayCache.set(panel.id, comp);
          this.activeOverlay.set(comp);
        });
        return;
      }

      this.activeOverlay.set(null);
    });

    this.destroyRef.onDestroy(() => this.cleanup());
  }

  private createComponent(comp: RuntimeComponent): void {
    this.cleanup();

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

    this.componentRef = this.outlet().createComponent(comp.type, { injector, projectableNodes });

    for (const output of comp.meta.outputs) {
      const emitter = (this.componentRef.instance as Record<string, unknown>)[output.name];
      if (emitter && typeof (emitter as { subscribe?: unknown }).subscribe === 'function') {
        const sub = (emitter as { subscribe(fn: (v: unknown) => void): { unsubscribe(): void } })
          .subscribe((v: unknown) => this.eventLogService.log(output.name, v));
        this.outputSubscriptions.push(sub);
      }
    }

    for (const [key, value] of Object.entries(this.rendererService.inputValues())) {
      this.componentRef.setInput(key, value);
    }
    this.componentRef.changeDetectorRef.detectChanges();

    performance.mark('prism:render:end', detail);
    performance.measure('prism:render', 'prism:render:start', 'prism:render:end');

    this.rendererService.renderedElement.set(this.componentRef.location.nativeElement);
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

function parseContentToNodes(content: string | Record<string, string>): Node[][] {
  if (typeof content === 'string') {
    return [htmlToNodes(content)];
  }

  const defaultNodes = content['default'] ? htmlToNodes(content['default']) : [];
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
