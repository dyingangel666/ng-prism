import { Component, ElementRef, inject, computed, effect, viewChild, viewChildren, ChangeDetectionStrategy } from '@angular/core';
import { PrismIconComponent } from '../icons/prism-icon.component.js';
import { PrismNavigationService } from '../services/prism-navigation.service.js';
import { PrismRendererService } from '../services/prism-renderer.service.js';
import { spectrumSlot } from './spectrum.js';

@Component({
    selector: 'prism-variant-ribbon',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [PrismIconComponent],
    templateUrl: './prism-variant-ribbon.component.html',
    styleUrl: './prism-variant-ribbon.component.css'
})
export class PrismVariantRibbonComponent {
    private readonly navigationService = inject(PrismNavigationService);
    protected readonly rendererService = inject(PrismRendererService);

    private readonly tabsContainer = viewChild<ElementRef<HTMLElement>>('tabsContainer');
    private readonly tabButtons = viewChildren<ElementRef<HTMLButtonElement>>('tabButton');

    protected readonly variants = computed(() => {
        const comp = this.navigationService.activeComponent();
        return comp?.meta.showcaseConfig.variants ?? [];
    });

    constructor() {
        effect(() => {
            const idx = this.rendererService.activeVariantIndex();
            const container = this.tabsContainer()?.nativeElement;
            const button = this.tabButtons()[idx]?.nativeElement;
            if (!container || !button) return;

            const buttonLeft = button.offsetLeft;
            const buttonRight = buttonLeft + button.offsetWidth;
            const viewLeft = container.scrollLeft;
            const viewRight = viewLeft + container.clientWidth;

            if (buttonLeft < viewLeft) {
                container.scrollLeft = buttonLeft;
            } else if (buttonRight > viewRight) {
                container.scrollLeft = buttonRight - container.clientWidth;
            }
        });
    }

    protected slot(index: number): { i: number; n: number } {
        return spectrumSlot(index, this.variants().length);
    }

    protected prev(): void {
        const idx = this.rendererService.activeVariantIndex();
        if (idx > 0) this.rendererService.selectVariant(idx - 1);
    }

    protected next(): void {
        const idx = this.rendererService.activeVariantIndex();
        if (idx < this.variants().length - 1) this.rendererService.selectVariant(idx + 1);
    }
}
