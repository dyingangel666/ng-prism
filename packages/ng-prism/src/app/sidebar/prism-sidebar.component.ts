import { Component, computed, inject, signal, viewChild, ElementRef, HostListener, ChangeDetectionStrategy } from '@angular/core';
import { PrismIconComponent } from '../icons/prism-icon.component.js';
import { BUILTIN_NAVIGATION_DECORATIONS } from '../panels/builtin-navigation-decorations.js';
import type { NavigationItem } from '../services/navigation-item.types.js';
import { PrismNavigationService } from '../services/prism-navigation.service.js';
import { PrismPluginService } from '../services/prism-plugin.service.js';
import { PrismSearchService } from '../services/prism-search.service.js';
import type { ComponentStatus } from '../../decorator/showcase.types.js';
import { decorateItem, lifecycleIcon, resolveNavigationDecorations, rollupCategory, type CategoryRollup, type ItemDecorations } from './navigation-decorations.js';

const STORAGE_KEY = 'ng-prism-sidebar-collapsed';

const SECTION_ICONS: Record<string, string> = {
    Components: 'box',
    Directives: 'zap'
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
    templateUrl: './prism-sidebar.component.html',
    styleUrl: './prism-sidebar.component.css'
})
export class PrismSidebarComponent {
    protected readonly navigationService = inject(PrismNavigationService);
    protected readonly searchService = inject(PrismSearchService);
    private readonly pluginService = inject(PrismPluginService);
    private readonly filterInput = viewChild<ElementRef<HTMLInputElement>>('filterInput');

    private readonly decorations = computed(() => resolveNavigationDecorations(BUILTIN_NAVIGATION_DECORATIONS, this.pluginService.navigationDecorations()));

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
            items
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
                    decorations: decorateItem(item, defs)
                }));
                return {
                    name: cat.name,
                    rollup: rollupCategory(items.map((row) => row.decorations)),
                    items
                };
            })
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
        return item.kind === 'component' ? item.data.meta.className : `page:${item.data.title}`;
    }

    protected itemLabel(item: NavigationItem): string {
        return item.kind === 'component' ? item.data.meta.showcaseConfig.title : item.data.title;
    }

    protected itemStatus(item: NavigationItem): ComponentStatus | undefined {
        return item.kind === 'component' ? item.data.meta.showcaseConfig.status : undefined;
    }

    /**
     * Accessible name for the roll-up pill, for the deviating case only. The
     * pill otherwise renders a bare number distinguished only by colour — a
     * screen reader would read the group head as "Feedback 3 12" with nothing
     * naming what either number means, and a colour-blind reader can't tell
     * them apart at all.
     *
     * There is deliberately no zero branch: a clean category renders its plain
     * item count and the template leaves both attributes off, because
     * `aria-label` on a descendant feeds the group button's name-from-content
     * and "Buttons 0 components need review" is a claim about a group that has
     * nothing to review.
     */
    protected rollupTooltip(rollup: CategoryRollup): string {
        const noun = rollup.problems === 1 ? 'component needs' : 'components need';
        return `${rollup.problems} ${noun} review`;
    }

    protected itemTooltip(item: NavigationItem, decorations: ItemDecorations | null): string | null {
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
