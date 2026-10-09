import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { RuntimeComponent } from '../../plugin/plugin.types.js';
import { PrismOverviewCellComponent } from './prism-overview-cell.component.js';

/**
 * All variants of one component at once: a contact sheet rather than a
 * viewfinder.
 *
 * No controls of any kind: columns follow the window, and
 * everything else a cell shows is what the variant itself declared.
 */
@Component({
    selector: 'prism-overview',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [PrismOverviewCellComponent],
    templateUrl: './prism-overview.component.html',
    styleUrl: './prism-overview.component.css'
})
export class PrismOverviewComponent {
    /** Input name fixed by `prism-view-panel-host`, which feeds every view panel. */
    readonly activeComponent = input<RuntimeComponent | null>(null);

    protected readonly variants = computed(() => this.activeComponent()?.meta.showcaseConfig.variants ?? []);
}
