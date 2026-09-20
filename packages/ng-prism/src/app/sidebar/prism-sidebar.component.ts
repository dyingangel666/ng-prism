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
import { BUILTIN_NAVIGATION_DECORATIONS } from '../panels/builtin-navigation-decorations.js';
import type { NavigationItem } from '../services/navigation-item.types.js';
import { PrismNavigationService } from '../services/prism-navigation.service.js';
import { PrismPluginService } from '../services/prism-plugin.service.js';
import { PrismSearchService } from '../services/prism-search.service.js';
import type { ComponentStatus } from '../../decorator/showcase.types.js';
import {
  decorateItem,
  lifecycleIcon,
  resolveNavigationDecorations,
  rollupCategory,
  type CategoryRollup,
  type ItemDecorations,
} from './navigation-decorations.js';

const STORAGE_KEY = 'ng-prism-sidebar-collapsed';

const SECTION_ICONS: Record<string, string> = {
  Components: 'box',
  Directives: 'zap',
};
const DEFAULT_SECTION_ICON = 'box-select';

function sectionIcon(name: string): string {
  return SECTION_ICONS[name] ?? DEFAULT_SECTION_ICON;
}

interface SidebarCategory {
  name: string;
  items: NavigationItem[];
}

interface SidebarItem {
  item: NavigationItem;
  icon: string;
  decorations: ItemDecorations | null;
}

interface ComponentCategory {
  name: string;
  items: SidebarItem[];
  rollup: CategoryRollup;
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
              <span class="sb-group-chip"></span>
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
        } @for (section of componentSections(); track section.name) {
        <div class="sb-section-head">
          <span class="sb-section-head-l">
            <prism-icon
              [name]="section.icon"
              [size]="10"
              class="sb-section-icon"
            />
            {{ section.name }}
          </span>
          <span>{{ section.totalCount }}</span>
        </div>
        @for (cat of section.categories; track cat.name) {
        <div
          class="sb-group"
          [class.sb-group--collapsed]="
            isCollapsed('sec:' + section.name + ':' + cat.name)
          "
        >
          <button
            class="sb-group-head"
            (click)="toggleCollapse('sec:' + section.name + ':' + cat.name)"
            [attr.aria-expanded]="
              !isCollapsed('sec:' + section.name + ':' + cat.name)
            "
          >
            <prism-icon name="chevron-down" [size]="10" />
            <span class="sb-group-chip"></span>
            {{ cat.name }}
            <span
              class="sb-group-count"
              [class.sb-group-count--warn]="cat.rollup.variant === 'warn'"
              [class.sb-group-count--danger]="cat.rollup.variant === 'danger'"
              [attr.title]="rollupTooltip(cat.rollup)"
              [attr.aria-label]="rollupTooltip(cat.rollup)"
            >
              @if (cat.rollup.problems) { {{ cat.rollup.problems }}/{{
                cat.items.length
              }}
              } @else { {{ cat.items.length }} }
            </span>
          </button>
          @if (!isCollapsed('sec:' + section.name + ':' + cat.name)) {
          <div class="sb-group-body">
            @for (row of cat.items; track itemKey(row.item)) {
            <button
              class="sb-item"
              [class.sb-item--active]="isActive(row.item)"
              [class.sb-item--deprecated]="
                itemStatus(row.item) === 'deprecated'
              "
              [attr.title]="itemTooltip(row.item, row.decorations)"
              (click)="onSelect(row.item)"
            >
              <prism-icon [name]="row.icon" [size]="12" class="sb-item-icon" />
              <span class="sb-item-name">{{ itemLabel(row.item) }}</span>
              <span class="sb-item-health">
                @for (mark of row.decorations?.marks ?? []; track mark.id) {
                <prism-icon
                  [name]="mark.icon"
                  [size]="11"
                  [class]="'sb-health sb-health--' + mark.variant"
                />
                }
              </span>
            </button>
            }
          </div>
          }
        </div>
        } }
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
      background: var(--prism-text-ghost);
    }
    .sb-group-count {
      margin-left: auto;
      font-family: var(--font-mono);
      font-size: 10px;
      color: var(--prism-text-ghost);
      font-weight: 500;
    }
    .sb-group-count--warn { color: var(--prism-mark-attention); }
    .sb-group-count--danger { color: var(--prism-mark-critical); }

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
      background: none;
      transition: background var(--dur-fast), color var(--dur-fast);
      text-align: left;
      font-family: var(--font-sans);
    }
    .sb-item:hover {
      background: color-mix(in srgb, var(--prism-primary) 5%, transparent);
      color: var(--prism-text);
    }
    .sb-item--active {
      background: color-mix(in srgb, var(--prism-primary) 12%, transparent);
      font-weight: 500;
    }
    .sb-item-icon { flex: 0 0 12px; opacity: 0.7; }
    .sb-item-name {
      flex: 1;
      min-width: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Fixed width sized for the three built-in decoration sources (a11y,
       plugin-coverage, plugin-visual-regression) at 11px each plus two
       --sp-1 gaps, with a little headroom. navigationDecorations is an open
       extension point, so a fourth mark from a third-party plugin is
       clipped via overflow: hidden rather than allowed to grow the gutter —
       the point of a fixed-width gutter is that rows never shift
       horizontally as you scan the list. */
    .sb-item-health {
      width: 40px;
      flex: none;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: var(--sp-1);
      overflow: hidden;
    }

    /* Outline, not fill, and full saturation only for danger. The mechanism
       behind these marks is already deviation-driven: decorateItem returns
       null for a clean component and every source bails out at variant === 'ok'.
       What made them read as wallpaper was the drawing: a filled shape at full
       saturation, one per row, in a repo where deviating is the normal case. */
    .sb-health { fill: none; stroke: currentColor; stroke-width: 2; }
    .sb-health--warn {
      color: color-mix(in srgb, var(--prism-mark-attention) 80%, transparent);
    }
    .sb-health--danger { color: var(--prism-mark-critical); }

    .sb-item--deprecated .sb-item-name {
      text-decoration: line-through;
      text-decoration-thickness: 1px;
      color: var(--prism-text-ghost);
      opacity: 0.7;
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
  private readonly pluginService = inject(PrismPluginService);
  private readonly filterInput =
    viewChild<ElementRef<HTMLInputElement>>('filterInput');

  private readonly decorations = computed(() =>
    resolveNavigationDecorations(
      BUILTIN_NAVIGATION_DECORATIONS,
      this.pluginService.navigationDecorations()
    )
  );

  @HostListener('document:keydown', ['$event'])
  protected onGlobalKey(e: KeyboardEvent): void {
    if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
    const tag = (e.target as HTMLElement).tagName;
    if (
      tag === 'INPUT' ||
      tag === 'TEXTAREA' ||
      (e.target as HTMLElement).isContentEditable
    )
      return;
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
      items,
    }));
  });

  protected readonly componentSections = computed(() => {
    const defs = this.decorations();
    return this.navigationService.sectionTree().map((section) => ({
      name: section.name,
      icon: sectionIcon(section.name),
      totalCount: section.totalCount,
      categories: section.categories.map((cat): ComponentCategory => {
        const items = cat.items.map((item) => ({
          item,
          icon: lifecycleIcon(this.itemStatus(item)),
          decorations: decorateItem(item, defs),
        }));
        return {
          name: cat.name,
          rollup: rollupCategory(items.map((row) => row.decorations)),
          items,
        };
      }),
    }));
  });

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

  protected itemStatus(item: NavigationItem): ComponentStatus | undefined {
    return item.kind === 'component'
      ? item.data.meta.showcaseConfig.status
      : undefined;
  }

  /**
   * Accessible name for the roll-up pill. The pill otherwise renders a bare
   * number distinguished only by colour — a screen reader would read the
   * group head as "Feedback 3 12" with nothing naming what either number
   * means, and a colour-blind reader can't tell them apart at all.
   */
  protected rollupTooltip(rollup: CategoryRollup): string {
    const noun = rollup.problems === 1 ? 'component needs' : 'components need';
    return `${rollup.problems} ${noun} review`;
  }

  protected itemTooltip(
    item: NavigationItem,
    decorations: ItemDecorations | null
  ): string | null {
    const status = this.itemStatus(item);
    const lines: string[] = [];
    if (status === 'wip') lines.push('Work in progress');
    if (status === 'deprecated') lines.push('Deprecated / Legacy');
    if (decorations) lines.push(decorations.tooltip);
    return lines.length ? lines.join('\n') : null;
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
