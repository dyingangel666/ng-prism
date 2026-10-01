import { ChangeDetectionStrategy, Component, computed, HostListener, inject } from '@angular/core';
import type { NgPrismConfig } from '../../plugin/plugin.types.js';
import { PrismIconComponent } from '../icons/prism-icon.component.js';
import { PrismLayoutMenuComponent } from '../layout-menu/prism-layout-menu.component.js';
import { BUILTIN_HEADER_WIDGETS } from '../panels/builtin-header-widgets.js';
import { PrismPluginService } from '../services/prism-plugin.service.js';
import { PrismSearchService } from '../services/prism-search.service.js';
import { PrismThemeService } from '../services/prism-theme.service.js';
import { PRISM_CONFIG } from '../tokens/prism-tokens.js';
import { PrismHeaderWidgetHostComponent } from './prism-header-widget-host.component.js';

@Component({
    selector: 'prism-header',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [PrismIconComponent, PrismLayoutMenuComponent, PrismHeaderWidgetHostComponent],
    templateUrl: './prism-header.component.html',
    styleUrl: './prism-header.component.css'
})
export class PrismHeaderComponent {
    private readonly config = inject<NgPrismConfig>(PRISM_CONFIG);
    private readonly pluginService = inject(PrismPluginService);
    protected readonly searchService = inject(PrismSearchService);
    protected readonly themeService = inject(PrismThemeService);

    protected readonly widgetsStart = computed(() =>
        [...BUILTIN_HEADER_WIDGETS.filter((w) => w.placement === 'start'), ...this.pluginService.headerWidgetsStart()].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    );

    protected readonly widgetsEnd = computed(() =>
        [...BUILTIN_HEADER_WIDGETS.filter((w) => (w.placement ?? 'end') === 'end'), ...this.pluginService.headerWidgetsEnd()].sort(
            (a, b) => (a.order ?? 0) - (b.order ?? 0)
        )
    );

    protected readonly logoUrl = computed(() => {
        const logo = this.config.logo;

        if (!logo) return null;
        const isDark = this.themeService.isDark();

        return (isDark ? (logo.dark ?? logo.light) : (logo.light ?? logo.dark)) ?? null;
    });

    protected readonly title = computed(() => this.config.title ?? 'ng-prism');
    protected readonly subtitle = computed(() => this.config.subtitle ?? null);

    protected readonly buildInfoLabel = computed(() => {
        const info = this.config.buildInfo;

        if (!info) return null;
        const parts: string[] = [];

        if (info.version) parts.push(`v${info.version}`);
        if (info.gitHash) parts.push(info.gitHash.slice(0, 7));
        return parts.length ? parts.join(' · ') : null;
    });

    @HostListener('document:keydown', ['$event'])
    protected onGlobalKey(e: KeyboardEvent): void {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            this.onSearchFocus();
        }
    }

    protected onSearchFocus(): void {
        // Placeholder — will be wired to command palette later
    }
}
