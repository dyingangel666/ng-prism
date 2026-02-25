import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  type ElementRef,
  inject,
  input,
  Renderer2,
  viewChild,
} from '@angular/core';

@Component({
  selector: 'prism-figma-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (figmaUrl()) {
      <iframe
        #iframe
        class="prism-figma-panel__iframe"
        allowfullscreen
      ></iframe>
    } @else {
      <div class="prism-figma-panel__empty">
        No Figma design linked. Add <code>meta: {{ '{' }} figma: 'https://...' {{ '}' }}</code> to &#64;Showcase.
      </div>
    }
  `,
  styles: `
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }

    .prism-figma-panel__iframe {
      width: 100%;
      height: 100%;
      min-height: 400px;
      border: none;
    }

    .prism-figma-panel__empty {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      min-height: 200px;
      color: var(--prism-text-muted, #6b7280);
      font-size: 14px;
    }

    .prism-figma-panel__empty code {
      font-family: var(--prism-font-mono, monospace);
      background: var(--prism-bg-surface, #f3f4f6);
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 13px;
    }
  `,
})
export class FigmaPanelComponent {
  private readonly renderer = inject(Renderer2);
  private readonly iframe = viewChild<ElementRef>('iframe');

  readonly activeComponent = input<unknown>(null);

  protected readonly figmaUrl = computed(() => {
    const comp = this.activeComponent() as any;
    if (!comp) return null;
    const url = comp.meta?.showcaseConfig?.meta?.['figma'];
    return typeof url === 'string' ? url : null;
  });

  constructor() {
    effect(() => {
      const url = this.figmaUrl();
      const el = this.iframe()?.nativeElement;
      if (el && url) {
        this.renderer.setAttribute(
          el,
          'src',
          `https://www.figma.com/embed?embed_host=ng-prism&url=${encodeURIComponent(url)}`,
        );
      }
    });
  }
}
