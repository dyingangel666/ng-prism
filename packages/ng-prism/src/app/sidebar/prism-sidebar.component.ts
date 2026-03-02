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
      margin-bottom: 4px;
    }
    .prism-sidebar__category-title {
      margin: 0;
      padding: 8px 16px 4px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--prism-text-muted);
    }
    .prism-sidebar__item {
      display: block;
      width: calc(100% - 16px);
      margin: 1px 8px;
      text-align: left;
      padding: 6px 12px;
      font-size: 13px;
      font-family: var(--prism-font-family);
      border: none;
      background: none;
      color: var(--prism-text-muted);
      cursor: pointer;
      border-radius: var(--prism-radius);
      transition: background 0.12s, color 0.12s;
    }
    .prism-sidebar__item:hover {
      background: color-mix(in srgb, var(--prism-primary) 8%, transparent);
      color: var(--prism-text);
    }
    .prism-sidebar__item--active {
      background: linear-gradient(135deg, var(--prism-primary-from), var(--prism-primary-to));
      color: #ffffff;
      font-weight: 500;
      box-shadow: 0 2px 12px var(--prism-glow);
    }
    .prism-sidebar__item--active:hover {
      background: linear-gradient(135deg, var(--prism-primary-from), var(--prism-primary-to));
      color: #ffffff;
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
