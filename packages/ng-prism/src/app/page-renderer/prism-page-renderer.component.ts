import { Component, effect, ElementRef, inject } from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { PrismNavigationService } from '../services/prism-navigation.service.js';

@Component({
  selector: 'prism-page-renderer',
  standalone: true,
  imports: [NgComponentOutlet],
  template: `
    @if (page(); as p) {
      <div class="prism-page-renderer">
        <h2 class="prism-page-renderer__title">{{ p.title }}</h2>
        @switch (p.type) {
          @case ('custom') {
            <pre class="prism-page-renderer__json">{{ $any(p).data | json }}</pre>
          }
          @case ('component') {
            <div class="prism-page-renderer__component">
              <ng-container *ngComponentOutlet="$any(p).component" />
            </div>
          }
        }
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
      padding: 16px 20px;
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
