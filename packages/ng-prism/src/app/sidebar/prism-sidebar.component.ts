import { Component, computed, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import type { NavigationItem } from '../services/navigation-item.types.js';
import { PrismNavigationService } from '../services/prism-navigation.service.js';

const STORAGE_KEY = 'ng-prism-sidebar-expanded';

interface SidebarCategory {
  name: string;
  items: NavigationItem[];
}

interface SidebarGroup {
  name: string | null;
  categories: SidebarCategory[];
}

@Component({
  selector: 'prism-sidebar',
  standalone: true,
  imports: [NgTemplateOutlet],
  template: `
    <nav class="prism-sidebar">
      @for (group of groups(); track group.name ?? '__ungrouped'; let gi = $index) {
        @if (group.name) {
          <div class="prism-sidebar__group">
            <button
              class="prism-sidebar__group-title"
              (click)="toggle('group:' + group.name, gi)"
            >
              <svg
                class="prism-sidebar__chevron"
                [class.prism-sidebar__chevron--expanded]="isExpanded('group:' + group.name, gi)"
                viewBox="0 0 16 16"
              >
                <path d="M6 4l4 4-4 4"/>
              </svg>
              {{ group.name }}
            </button>
            @if (isExpanded('group:' + group.name, gi)) {
              @for (cat of group.categories; track cat.name) {
                <ng-container *ngTemplateOutlet="categoryTpl; context: { cat, nested: true }" />
              }
            }
          </div>
        } @else {
          @for (cat of group.categories; track cat.name) {
            <ng-container *ngTemplateOutlet="categoryTpl; context: { cat, nested: false }" />
          }
        }
      }

      <ng-template #categoryTpl let-cat="cat" let-nested="nested">
        <div class="prism-sidebar__category" [class.prism-sidebar__category--nested]="nested">
          <button
            class="prism-sidebar__category-title"
            [class.prism-sidebar__category-title--nested]="nested"
            (click)="toggle('cat:' + cat.name, 0)"
          >
            <svg
              class="prism-sidebar__chevron"
              [class.prism-sidebar__chevron--expanded]="isExpanded('cat:' + cat.name, 0)"
              viewBox="0 0 16 16"
            >
              <path d="M6 4l4 4-4 4"/>
            </svg>
            {{ cat.name }}
          </button>
          @if (isExpanded('cat:' + cat.name, 0)) {
            @for (item of cat.items; track itemKey(item)) {
              <button
                class="prism-sidebar__item"
                [class.prism-sidebar__item--active]="isActive(item)"
                [class.prism-sidebar__item--nested]="nested"
                [class.prism-sidebar__item--page]="item.kind === 'page'"
                (click)="onSelect(item)"
              >
                @if (item.kind === 'page') {
                  <span class="prism-sidebar__page-icon">◈</span>
                }
                {{ itemLabel(item) }}
              </button>
            }
          }
        </div>
      </ng-template>
    </nav>
  `,
  styles: `
    .prism-sidebar {
      background: var(--prism-sidebar-bg, var(--prism-bg));
      border-right: 1px solid var(--prism-border);
      overflow-y: auto;
      overflow-x: hidden;
      padding: 4px 0;
      height: 100%;
    }
    .prism-sidebar::-webkit-scrollbar { width: 4px; }
    .prism-sidebar::-webkit-scrollbar-track { background: transparent; }
    .prism-sidebar::-webkit-scrollbar-thumb { background: var(--prism-border-strong); border-radius: 2px; }

    .prism-sidebar__group { margin-bottom: 2px; }

    .prism-sidebar__group-title {
      display: flex;
      align-items: center;
      gap: 6px;
      width: 100%;
      margin: 0;
      padding: 8px 16px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--prism-text-2);
      font-family: var(--prism-font-sans);
      background: color-mix(in srgb, var(--prism-primary) 10%, transparent);
      border: none;
      border-left: 2px solid color-mix(in srgb, var(--prism-primary) 50%, transparent);
      cursor: pointer;
      text-align: left;
      transition: background 0.12s, color 0.12s, border-color 0.12s;
    }

    .prism-sidebar__group-title:hover {
      background: color-mix(in srgb, var(--prism-primary) 16%, transparent);
      color: var(--prism-text);
      border-left-color: var(--prism-primary);
    }

    .prism-sidebar__category { margin-bottom: 2px; }

    .prism-sidebar__category-title {
      display: flex;
      align-items: center;
      gap: 6px;
      width: 100%;
      margin: 0;
      padding: 7px 16px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--prism-text-2);
      font-family: var(--prism-font-sans);
      background: color-mix(in srgb, var(--prism-primary) 8%, transparent);
      border: none;
      border-left: 2px solid color-mix(in srgb, var(--prism-primary) 40%, transparent);
      cursor: pointer;
      text-align: left;
      transition: background 0.12s, color 0.12s, border-color 0.12s;
    }

    .prism-sidebar__category-title:hover {
      background: color-mix(in srgb, var(--prism-primary) 14%, transparent);
      color: var(--prism-text);
      border-left-color: var(--prism-primary);
    }

    .prism-sidebar__category-title--nested {
      padding-left: 28px;
      font-weight: 500;
      font-size: 11px;
      background: color-mix(in srgb, var(--prism-primary) 4%, transparent);
      border-left-color: color-mix(in srgb, var(--prism-primary) 25%, transparent);
    }

    .prism-sidebar__category-title--nested:hover {
      background: color-mix(in srgb, var(--prism-primary) 10%, transparent);
    }

    .prism-sidebar__chevron {
      width: 10px;
      height: 10px;
      flex-shrink: 0;
      transition: transform 0.15s;
      fill: none;
      stroke: currentColor;
      stroke-width: 1.5;
      stroke-linecap: round;
      stroke-linejoin: round;
      opacity: 0.5;
    }

    .prism-sidebar__group-title:hover .prism-sidebar__chevron,
    .prism-sidebar__category-title:hover .prism-sidebar__chevron {
      opacity: 0.8;
    }

    .prism-sidebar__chevron--expanded {
      transform: rotate(90deg);
    }

    .prism-sidebar__item {
      display: flex;
      align-items: center;
      gap: 6px;
      width: 100%;
      padding: 6px 14px 6px 24px;
      font-size: 13px;
      font-family: var(--prism-font-sans);
      border: none;
      background: none;
      color: var(--prism-text-muted);
      cursor: pointer;
      border-left: 2px solid transparent;
      text-align: left;
      transition: background 0.1s, color 0.1s, border-color 0.1s;
    }

    .prism-sidebar__item--nested {
      padding-left: 36px;
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

  private readonly expandedSet = signal<Set<string>>(this.loadExpanded());

  protected readonly groups = computed<SidebarGroup[]>(() => {
    const tree = this.navigationService.categoryTree();
    const groupMap = new Map<string | null, SidebarCategory[]>();

    for (const [fullCategory, items] of tree.entries()) {
      const sepIdx = fullCategory.indexOf(' / ');
      let groupName: string | null;
      let catName: string;

      if (sepIdx !== -1) {
        groupName = fullCategory.substring(0, sepIdx).trim();
        catName = fullCategory.substring(sepIdx + 3).trim();
      } else {
        groupName = null;
        catName = fullCategory;
      }

      const cats = groupMap.get(groupName) ?? [];
      cats.push({ name: catName, items });
      groupMap.set(groupName, cats);
    }

    const result: SidebarGroup[] = [];
    const ungrouped = groupMap.get(null);
    if (ungrouped) {
      result.push({ name: null, categories: ungrouped });
      groupMap.delete(null);
    }
    for (const [name, categories] of groupMap.entries()) {
      result.push({ name, categories });
    }
    return result;
  });

  protected isExpanded(key: string, index: number): boolean {
    const set = this.expandedSet();
    if (set.has(key)) return true;
    if (set.has(`__collapsed:${key}`)) return false;
    return index === 0;
  }

  protected toggle(key: string, index: number): void {
    this.expandedSet.update(prev => {
      const next = new Set(prev);
      const collapsedKey = `__collapsed:${key}`;
      if (next.has(key)) {
        next.delete(key);
        next.add(collapsedKey);
      } else if (next.has(collapsedKey)) {
        next.delete(collapsedKey);
        next.add(key);
      } else if (index === 0) {
        next.add(collapsedKey);
      } else {
        next.add(key);
      }
      this.saveExpanded(next);
      return next;
    });
  }

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

  protected isActive(item: NavigationItem): boolean {
    const active = this.navigationService.activeItem();
    if (!active || active.kind !== item.kind) return false;
    if (item.kind === 'component') {
      return item.data.meta.className === (active as typeof item).data.meta.className;
    }
    return item.data.title === (active as typeof item).data.title;
  }

  protected onSelect(item: NavigationItem): void {
    if (item.kind === 'component') {
      this.navigationService.select(item.data);
    } else {
      this.navigationService.selectPage(item.data);
    }
  }

  private loadExpanded(): Set<string> {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  }

  private saveExpanded(set: Set<string>): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
    } catch { /* ignore */ }
  }
}
