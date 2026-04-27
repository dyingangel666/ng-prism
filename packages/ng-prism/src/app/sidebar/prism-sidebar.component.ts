import {
  Component,
  computed,
  inject,
  signal,
  viewChild,
  ElementRef,
  HostListener,
  ChangeDetectionStrategy,
} from '@angular/core';
import { PrismIconComponent } from '../icons/prism-icon.component.js';
import type { NavigationItem } from '../services/navigation-item.types.js';
import { PrismNavigationService } from '../services/prism-navigation.service.js';
import { PrismSearchService } from '../services/prism-search.service.js';
import { PrismManifestService } from '../services/prism-manifest.service.js';

const STORAGE_KEY = 'ng-prism-sidebar-collapsed';

const CATEGORY_COLORS: Record<string, string> = {
  'Data Display': '#f472b6',
  Feedback: '#fbbf24',
  Inputs: '#a78bfa',
  Layout: '#34d399',
  Navigation: '#60a5fa',
  Overlay: '#c084fc',
  Directives: '#ec4899',
};

function categoryColor(name: string): string {
  if (CATEGORY_COLORS[name]) return CATEGORY_COLORS[name];
  let hash = 0;
  for (let i = 0; i < name.length; i++)
    hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 65%)`;
}

interface SidebarCategory {
  name: string;
  color: string;
  items: NavigationItem[];
}

@Component({
  selector: 'prism-sidebar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrismIconComponent],
  template: `
    <nav class="prism-sidebar">
      <div class="sb-filter">
        <prism-icon name="search" [size]="12" />
        <input
          #filterInput
          placeholder="Filter components…"
          [value]="searchService.query()"
          (input)="searchService.search($any($event.target).value)"
        />
        <kbd>/</kbd>
      </div>

      <div class="sb-scroll">
        @if (pageCategories().length > 0) {
        <div class="sb-pinned">
          <div class="sb-pinned-head">
            <span class="sb-pinned-head-l">
              <prism-icon name="pin" [size]="10" class="sb-pinned-pin" />
              Pages
            </span>
            <span>{{ totalPages() }}</span>
          </div>
          @for (cat of pageCategories(); track cat.name) {
          <div
            class="sb-group"
            [class.sb-group--collapsed]="isCollapsed('page:' + cat.name)"
          >
            <button
              class="sb-group-head"
              (click)="toggleCollapse('page:' + cat.name)"
              [attr.aria-expanded]="!isCollapsed('page:' + cat.name)"
            >
              <prism-icon name="chevron-down" [size]="10" />
              <span class="sb-group-chip" [style.--chip]="cat.color"></span>
              {{ cat.name }}
            </button>
            @if (!isCollapsed('page:' + cat.name)) {
            <div class="sb-group-body">
              @for (item of cat.items; track itemKey(item)) {
              <button
                class="sb-item"
                [class.sb-item--active]="isActive(item)"
                (click)="onSelect(item)"
              >
                <span class="sb-item-name">{{ itemLabel(item) }}</span>
              </button>
              }
            </div>
            }
          </div>
          }
        </div>
        } @if (componentCategories().length > 0) {
        <div class="sb-section-head">
          <span class="sb-section-head-l">
            <prism-icon name="box" [size]="10" class="sb-section-icon" />
            Components
          </span>
          <span>{{ totalComponents() }}</span>
        </div>
        } @for (cat of componentCategories(); track cat.name) {
        <div
          class="sb-group"
          [class.sb-group--collapsed]="isCollapsed('comp:' + cat.name)"
        >
          <button
            class="sb-group-head"
            (click)="toggleCollapse('comp:' + cat.name)"
            [attr.aria-expanded]="!isCollapsed('comp:' + cat.name)"
          >
            <prism-icon name="chevron-down" [size]="10" />
            <span class="sb-group-chip" [style.--chip]="cat.color"></span>
            {{ cat.name }}
            <span class="sb-group-count">{{ cat.items.length }}</span>
          </button>
          @if (!isCollapsed('comp:' + cat.name)) {
          <div class="sb-group-body">
            @for (item of cat.items; track itemKey(item)) {
            <button
              class="sb-item"
              [class.sb-item--active]="isActive(item)"
              (click)="onSelect(item)"
            >
              <prism-icon name="box" [size]="12" class="sb-item-icon" />
              <span class="sb-item-name">{{ itemLabel(item) }}</span>
            </button>
            }
          </div>
          }
        </div>
        }
      </div>
    </nav>
  `,
  styles: `
    .prism-sidebar {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 0;
      overflow: hidden;
    }

    .sb-filter {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 12px;
      padding: 0 10px;
      height: 30px;
      background: var(--prism-input-bg);
      border: 1px solid var(--prism-border);
      border-radius: 6px;
      color: var(--prism-text-muted);
    }
    .sb-filter input {
      flex: 1;
      min-width: 0;
      background: transparent;
      border: 0;
      outline: none;
      font-size: var(--fs-md);
      color: var(--prism-text);
      font-family: var(--font-sans);
    }
    .sb-filter input::placeholder { color: var(--prism-text-muted); }
    .sb-filter kbd {
      font-family: var(--font-mono);
      font-size: 10px;
      color: var(--prism-text-ghost);
      padding: 1px 5px;
      border: 1px solid var(--prism-border);
      border-radius: 3px;
    }

    .sb-scroll {
      flex: 1;
      overflow-y: auto;
      padding: 10px 0 16px;
      padding-top: 0;
    }
    .sb-scroll::-webkit-scrollbar { width: 8px; }
    .sb-scroll::-webkit-scrollbar-thumb { background: var(--prism-border-strong); border-radius: 4px; }
    .sb-scroll::-webkit-scrollbar-track { background: transparent; }

    .sb-pinned {
      padding: 0 0 10px;
      margin-bottom: 4px;
      border-bottom: 1px solid var(--prism-border);
      border-top: 1px solid var(--prism-border);
    }
    .sb-section-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 14px 6px;
      font-size: 10.5px;
      font-weight: 700;
      letter-spacing: 0.09em;
      text-transform: uppercase;
      color: var(--prism-text-ghost);
      margin-top: 6px;
    }
    .sb-section-head-l { display: flex; align-items: center; gap: 6px; }
    .sb-section-icon { color: var(--prism-primary); }
    .sb-pinned-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 14px 6px;
      margin-top: 6px;
      font-size: 10.5px;
      font-weight: 700;
      letter-spacing: 0.09em;
      text-transform: uppercase;
      color: var(--prism-text-ghost);
    }
    .sb-pinned-head-l { display: flex; align-items: center; gap: 6px; }
    .sb-pinned-pin { color: var(--prism-accent); }

    .sb-group { margin-bottom: 4px; }
    .sb-group-head {
      display: flex;
      align-items: center;
      gap: 6px;
      width: 100%;
      padding: 8px 14px 6px;
      font-size: 10.5px;
      font-weight: 700;
      letter-spacing: 0.09em;
      text-transform: uppercase;
      color: var(--prism-text-ghost);
      cursor: pointer;
      user-select: none;
      background: none;
      border: none;
      text-align: left;
      font-family: var(--font-sans);
    }
    .sb-group-head prism-icon {
      transition: transform var(--dur-fast);
      color: var(--prism-text-ghost);
    }
    .sb-group--collapsed .sb-group-head prism-icon { transform: rotate(-90deg); }

    .sb-group-chip {
      width: 6px;
      height: 6px;
      border-radius: 2px;
      background: var(--chip, var(--prism-primary));
      box-shadow: 0 0 6px var(--chip, var(--prism-primary));
    }
    .sb-group-count {
      margin-left: auto;
      font-family: var(--font-mono);
      font-size: 10px;
      color: var(--prism-text-ghost);
      font-weight: 500;
    }

    .sb-item {
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      height: 30px;
      padding: 0 14px 0 28px;
      font-size: 13px;
      color: var(--prism-text-2);
      cursor: pointer;
      border: none;
      border-left: 2px solid transparent;
      background: none;
      position: relative;
      transition: background var(--dur-fast), color var(--dur-fast);
      text-align: left;
      font-family: var(--font-sans);
    }
    .sb-item:hover {
      background: color-mix(in srgb, var(--prism-primary) 5%, transparent);
      color: var(--prism-text);
    }
    .sb-item--active {
      border-left-color: var(--prism-primary);
      background: color-mix(in srgb, var(--prism-primary) 12%, transparent);
      color: var(--prism-text);
      font-weight: 500;
    }
    .sb-item--active::before {
      content: '';
      position: absolute;
      left: -1px;
      top: 0;
      bottom: 0;
      width: 3px;
      background: linear-gradient(180deg, var(--prism-primary-from), var(--prism-primary-to));
    }
    .sb-item-icon { flex: 0 0 12px; opacity: 0.7; }
    .sb-item-name {
      flex: 1;
      min-width: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }


    :focus-visible {
      outline: 2px solid var(--prism-primary);
      outline-offset: 2px;
    }
  `,
})
export class PrismSidebarComponent {
  protected readonly navigationService = inject(PrismNavigationService);
  protected readonly searchService = inject(PrismSearchService);
  private readonly manifestService = inject(PrismManifestService);
  private readonly filterInput = viewChild<ElementRef<HTMLInputElement>>('filterInput');

  @HostListener('document:keydown', ['$event'])
  protected onGlobalKey(e: KeyboardEvent): void {
    if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable) return;
    e.preventDefault();
    this.filterInput()?.nativeElement.focus();
  }

  private readonly collapsedSet = signal<Set<string>>(this.loadCollapsed());

  protected readonly totalPages = computed(() => {
    return this.searchService.filteredPages().length;
  });

  protected readonly pageCategories = computed<SidebarCategory[]>(() => {
    const pages = this.searchService.filteredPages();
    const catMap = new Map<string, NavigationItem[]>();
    for (const page of pages) {
      const cat = page.category ?? 'Docs';
      const list = catMap.get(cat) ?? [];
      list.push({ kind: 'page', data: page });
      catMap.set(cat, list);
    }
    return [...catMap.entries()].map(([name, items]) => ({
      name,
      color: categoryColor(name),
      items,
    }));
  });

  protected readonly componentCategories = computed<SidebarCategory[]>(() => {
    const tree = this.navigationService.categoryTree();
    const result: SidebarCategory[] = [];
    for (const [catName, items] of tree.entries()) {
      const compItems = items.filter((i) => i.kind === 'component');
      if (compItems.length === 0) continue;
      result.push({
        name: catName,
        color: categoryColor(catName),
        items: compItems,
      });
    }
    return result;
  });

  protected readonly totalComponents = computed(
    () => this.manifestService.manifest().components.length,
  );

  protected isCollapsed(key: string): boolean {
    return this.collapsedSet().has(key);
  }

  protected toggleCollapse(key: string): void {
    this.collapsedSet.update((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      this.saveCollapsed(next);
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
      return (
        item.data.meta.className === (active as typeof item).data.meta.className
      );
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

  private loadCollapsed(): Set<string> {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  }

  private saveCollapsed(set: Set<string>): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
    } catch {}
  }
}
