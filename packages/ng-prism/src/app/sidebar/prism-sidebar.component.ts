import { Component, computed, inject } from '@angular/core';
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
      background: var(--prism-bg);
      border-right: 1px solid var(--prism-border);
      overflow-y: auto;
      overflow-x: hidden;
      padding: 8px 0;
      height: 100%;
    }
    .prism-sidebar::-webkit-scrollbar { width: 4px; }
    .prism-sidebar::-webkit-scrollbar-track { background: transparent; }
    .prism-sidebar::-webkit-scrollbar-thumb { background: var(--prism-border-strong); border-radius: 2px; }

    .prism-sidebar__category { margin-bottom: 4px; }

    .prism-sidebar__category-title {
      margin: 0;
      padding: 10px 16px 4px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--prism-text-ghost);
      font-family: var(--prism-font-sans);
    }

    .prism-sidebar__item {
      display: flex;
      align-items: center;
      gap: 6px;
      width: 100%;
      padding: 6px 14px 6px 11px;
      font-size: 13px;
      font-family: var(--prism-font-sans);
      border: none;
      background: none;
      color: var(--prism-text-muted);
      cursor: pointer;
      border-left: 3px solid transparent;
      text-align: left;
      transition: background 0.1s, color 0.1s, border-color 0.1s;
    }

    .prism-sidebar__item:hover {
      background: color-mix(in srgb, var(--prism-primary) 6%, transparent);
      color: var(--prism-text-2);
    }

    .prism-sidebar__item--active {
      border-left-color: var(--prism-primary);
      background: color-mix(in srgb, var(--prism-primary) 10%, transparent);
      color: var(--prism-text);
      font-weight: 500;
    }

    .prism-sidebar__item--active:hover {
      background: color-mix(in srgb, var(--prism-primary) 12%, transparent);
    }

    .prism-sidebar__page-icon {
      font-size: 10px;
      opacity: 0.6;
    }
  `,
})
export class PrismSidebarComponent {
  protected readonly navigationService = inject(PrismNavigationService);

  protected readonly entries = computed(() =>
    [...this.navigationService.categoryTree().entries()]);

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
