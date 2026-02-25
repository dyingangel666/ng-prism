import { Component, inject } from '@angular/core';
import type { NavigationItem } from '../services/navigation-item.types.js';
import { PrismNavigationService } from '../services/prism-navigation.service.js';

@Component({
  selector: 'prism-sidebar',
  standalone: true,
  template: `
    <nav class="prism-sidebar">
      @for (entry of entries(); track entry[0]) {
        <div class="prism-sidebar__category">
          <h3 class="prism-sidebar__category-title">{{ entry[0] }}</h3>
          @for (item of entry[1]; track itemKey(item)) {
            <button
              class="prism-sidebar__item"
              [class.prism-sidebar__item--active]="navigationService.activeItem() === item"
              [class.prism-sidebar__item--page]="item.kind === 'page'"
              (click)="onSelect(item)"
            >
              @if (item.kind === 'page') {
                <span class="prism-sidebar__page-icon">◈</span>
              }
              {{ itemLabel(item) }}
            </button>
          }
        </div>
      }
    </nav>
  `,
  styles: `
    .prism-sidebar {
      width: var(--prism-sidebar-width);
      background: var(--prism-sidebar-bg);
      border-right: 1px solid var(--prism-border);
      overflow-y: auto;
      padding: 12px 0;
    }
    .prism-sidebar__category {
      margin-bottom: 8px;
    }
    .prism-sidebar__category-title {
      margin: 0;
      padding: 4px 16px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--prism-text-muted);
    }
    .prism-sidebar__item {
      display: block;
      width: 100%;
      text-align: left;
      padding: 6px 16px 6px 24px;
      font-size: 13px;
      font-family: var(--prism-font-family);
      border: none;
      background: none;
      color: var(--prism-text);
      cursor: pointer;
    }
    .prism-sidebar__item:hover {
      background: var(--prism-border);
    }
    .prism-sidebar__item--active {
      color: var(--prism-primary);
      background: rgba(99, 102, 241, 0.08);
      font-weight: 500;
    }
    .prism-sidebar__page-icon {
      margin-right: 4px;
      font-size: 11px;
      opacity: 0.7;
    }
  `,
})
export class PrismSidebarComponent {
  protected readonly navigationService = inject(PrismNavigationService);

  protected readonly entries = () =>
    [...this.navigationService.categoryTree().entries()];

  protected itemKey(item: NavigationItem): string {
    return item.kind === 'component'
      ? item.data.meta.className
      : `page:${item.data.title}`;
  }

  protected itemLabel(item: NavigationItem): string {
    return item.kind === 'component'
      ? item.data.meta.showcaseConfig.title
      : item.data.title;
  }

  protected onSelect(item: NavigationItem): void {
    if (item.kind === 'component') {
      this.navigationService.select(item.data);
    } else {
      this.navigationService.selectPage(item.data);
    }
  }
}
