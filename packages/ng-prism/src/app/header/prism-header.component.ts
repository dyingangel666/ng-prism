import { Component, inject } from '@angular/core';
import { PrismSearchService } from '../services/prism-search.service.js';

@Component({
  selector: 'prism-header',
  standalone: true,
  template: `
    <header class="prism-header">
      <span class="prism-header__logo">ng-prism</span>
      <div class="prism-header__search">
        <input
          type="text"
          class="prism-header__input"
          placeholder="Search components…"
          [value]="searchService.query()"
          (input)="searchService.search($any($event.target).value)"
        />
      </div>
    </header>
  `,
  styles: `
    .prism-header {
      display: flex;
      align-items: center;
      gap: 24px;
      height: var(--prism-header-height);
      padding: 0 20px;
      background: var(--prism-bg);
      border-bottom: 1px solid var(--prism-border);
    }
    .prism-header__logo {
      font-size: 16px;
      font-weight: 700;
      color: var(--prism-primary);
      white-space: nowrap;
    }
    .prism-header__search {
      flex: 1;
      max-width: 320px;
    }
    .prism-header__input {
      width: 100%;
      padding: 6px 12px;
      border: 1px solid var(--prism-border);
      border-radius: var(--prism-radius);
      font-size: 13px;
      font-family: var(--prism-font-family);
      color: var(--prism-text);
      background: var(--prism-bg-surface);
    }
    .prism-header__input:focus {
      outline: 2px solid var(--prism-primary);
      outline-offset: -1px;
    }
    .prism-header__input::placeholder {
      color: var(--prism-text-muted);
    }
  `,
})
export class PrismHeaderComponent {
  protected readonly searchService = inject(PrismSearchService);
}
