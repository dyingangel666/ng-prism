import { Component, effect, ElementRef, inject } from '@angular/core';
import { JsonPipe, NgComponentOutlet } from '@angular/common';
import { PrismNavigationService } from '../services/prism-navigation.service.js';

@Component({
  selector: 'prism-page-renderer',
  standalone: true,
  imports: [JsonPipe, NgComponentOutlet],
  template: `
    @if (page(); as p) {
    <div class="prism-page-renderer">
      <h2 class="prism-page-renderer__title">{{ p.title }}</h2>
      @switch (p.type) { @case ('custom') {
      <pre class="prism-page-renderer__json">{{ $any(p).data | json }}</pre>
      } @case ('component') {
      <div class="prism-page-renderer__component">
        <ng-container *ngComponentOutlet="$any(p).component" />
      </div>
      } }
    </div>
    }
  `,
  styles: `
    :host { display: block; flex: 1; overflow-y: auto; }
    .prism-page-renderer__title {
      margin: 0;
      padding: 16px 20px;
      font-size: 18px;
      font-weight: 600;
      letter-spacing: -0.01em;
      color: var(--prism-text);
      font-family: var(--prism-font-sans);
      border-bottom: 1px solid var(--prism-border);
      border-left: 3px solid;
      border-image: linear-gradient(180deg, var(--prism-primary-from), var(--prism-primary-to)) 1;
      background: var(--prism-bg-surface);
    }
    .prism-page-renderer__component {
      padding: var(--sp-5) var(--sp-6);
      color: var(--prism-text-2);
      font-family: var(--prism-font-sans);
      font-size: var(--fs-lg);
      line-height: 1.6;
    }

    /* Projected page content arrives through ngComponentOutlet and carries no
       theme of its own. Without this scope a consuming app's plain <h2> renders
       in the browser default colour on the styleguide's dark shell — measured at
       rgb(26,26,46) on a dark ground, which is darker than the body text beneath
       it and inverts the hierarchy. These are deliberately element selectors:
       the content is authored by the consumer and carries no classes we know. */
    .prism-page-renderer__component :is(h1, h2, h3, h4, h5, h6) {
      color: var(--prism-text);
      font-family: var(--prism-font-sans);
      font-weight: 600;
      letter-spacing: -0.01em;
      line-height: 1.25;
      margin: var(--sp-6) 0 var(--sp-3);
    }
    .prism-page-renderer__component :is(h1, h2, h3, h4, h5, h6):first-child {
      margin-top: 0;
    }
    .prism-page-renderer__component h1 { font-size: 24px; }
    .prism-page-renderer__component h2 { font-size: 20px; }
    .prism-page-renderer__component h3 { font-size: 17px; }
    .prism-page-renderer__component :is(h4, h5, h6) { font-size: var(--fs-xl); }

    .prism-page-renderer__component :is(p, ul, ol) { margin: 0 0 var(--sp-4); }
    .prism-page-renderer__component :is(strong, b) { color: var(--prism-text); }
    .prism-page-renderer__component a { color: var(--prism-primary); }
    .prism-page-renderer__component :is(code, pre) {
      font-family: var(--prism-font-mono);
      font-size: var(--fs-md);
      color: var(--prism-text);
    }
    .prism-page-renderer__json {
      margin: 0;
      padding: 24px;
      font-size: 12px;
      font-family: monospace;
      color: var(--prism-text-muted);
      white-space: pre-wrap;
    }
  `,
})
export class PrismPageRendererComponent {
  private readonly nav = inject(PrismNavigationService);
  private readonly host = inject(ElementRef<HTMLElement>);
  protected readonly page = this.nav.activePage;

  constructor() {
    effect(() => {
      this.page();
      this.host.nativeElement.scrollTop = 0;
    });
  }
}
