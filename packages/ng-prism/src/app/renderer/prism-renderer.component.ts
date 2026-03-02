import {
  Component,
  type ComponentRef,
  computed,
  DestroyRef,
  effect,
  inject,
  Injector,
  signal,
  untracked,
  viewChild,
  ViewContainerRef,
} from '@angular/core';
import { Highlight } from 'ngx-highlightjs';
import type { RuntimeComponent } from '../../plugin/plugin.types.js';
import { PrismEventLogService } from '../services/prism-event-log.service.js';
import { PrismNavigationService } from '../services/prism-navigation.service.js';
import { PrismRendererService } from '../services/prism-renderer.service.js';
import { generateSnippet } from './snippet-generator.js';

@Component({
  selector: 'prism-renderer',
  standalone: true,
  imports: [Highlight],
  template: `
    <div class="prism-renderer">
      @if (navigationService.activeComponent(); as comp) {
        @if (comp.meta.showcaseConfig.variants?.length) {
          <div class="prism-renderer__variants">
            @for (variant of comp.meta.showcaseConfig.variants; track variant.name; let i = $index) {
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
      <div class="prism-renderer__canvas">
        <ng-container #outlet />
      </div>
      @if (snippet()) {
        <div class="prism-renderer__code-toggle">
          <button
            class="prism-renderer__code-button"
            (click)="codeVisible.set(!codeVisible())"
          >
            &lt;/&gt; Code
          </button>
        </div>
        @if (codeVisible()) {
          <div class="prism-renderer__code">
            <pre><code [highlight]="snippet()" language="xml"></code></pre>
          </div>
        }
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
    .prism-renderer__variants {
      display: flex;
      gap: 0;
      padding: 0 16px;
      border-bottom: 1px solid var(--prism-border);
      flex-shrink: 0;
    }
    .prism-renderer__variant {
      padding: 8px 16px;
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
      bottom: 0;
      left: 0;
      right: 0;
      height: 2px;
      background: linear-gradient(90deg, var(--prism-primary-from), var(--prism-primary-to));
      opacity: 0;
      transition: opacity 0.12s;
    }
    .prism-renderer__variant:hover {
      color: var(--prism-text);
    }
    .prism-renderer__variant--active {
      color: var(--prism-primary);
    }
    .prism-renderer__variant--active::after {
      opacity: 1;
    }
    .prism-renderer__canvas {
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
    }
    .prism-renderer__code-toggle {
      display: flex;
      border-top: 1px solid var(--prism-border);
      padding: 0 16px;
      flex-shrink: 0;
    }
    .prism-renderer__code-button {
      padding: 6px 12px;
      font-size: 12px;
      font-family: var(--prism-font-mono);
      border: none;
      background: none;
      color: var(--prism-text-muted);
      cursor: pointer;
      transition: color 0.12s;
    }
    .prism-renderer__code-button:hover {
      color: var(--prism-text);
    }
    .prism-renderer__code {
      border-top: 1px solid var(--prism-border);
      overflow: auto;
      flex-shrink: 0;
      background: var(--prism-bg);
    }
    .prism-renderer__code pre {
      margin: 0;
      padding: 16px;
      font-size: 13px;
      line-height: 1.6;
      font-family: var(--prism-font-mono);
    }
    .prism-renderer__code code {
      font-family: inherit;
    }
  `,
})
export class PrismRendererComponent {
  protected readonly navigationService = inject(PrismNavigationService);
  protected readonly rendererService = inject(PrismRendererService);
  private readonly eventLogService = inject(PrismEventLogService);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);

  private readonly outlet = viewChild.required('outlet', { read: ViewContainerRef });
  private componentRef: ComponentRef<unknown> | null = null;
  private outputSubscriptions: Array<{ unsubscribe(): void }> = [];

  readonly codeVisible = signal(false);

  readonly snippet = computed(() => {
    const comp = this.navigationService.activeComponent();
    if (!comp) return '';
    const variant = comp.meta.showcaseConfig.variants?.[this.rendererService.activeVariantIndex()];
    const explicitKeys = variant?.inputs ? new Set(Object.keys(variant.inputs)) : undefined;
    return generateSnippet(
      comp.meta.componentMeta.selector,
      comp.meta.inputs,
      this.rendererService.inputValues(),
      explicitKeys,
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
      const ref = this.componentRef;
      if (!ref) return;
      for (const [key, value] of Object.entries(inputs)) {
        ref.setInput(key, value);
      }
    });

    this.destroyRef.onDestroy(() => this.cleanup());
  }

  private createComponent(comp: RuntimeComponent): void {
    this.cleanup();

    const injector = Injector.create({
      providers: comp.meta.showcaseConfig.providers ?? [],
      parent: this.injector,
    });

    this.componentRef = this.outlet().createComponent(comp.type, { injector });

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

    this.rendererService.renderedElement.set(this.componentRef.location.nativeElement);
  }

  private cleanup(): void {
    this.rendererService.renderedElement.set(null);
    for (const sub of this.outputSubscriptions) {
      sub.unsubscribe();
    }
    this.outputSubscriptions = [];
    this.outlet().clear();
    this.componentRef = null;
  }
}
