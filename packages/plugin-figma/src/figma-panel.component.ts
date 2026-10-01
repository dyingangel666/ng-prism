import { ChangeDetectionStrategy, Component, computed, effect, type ElementRef, inject, input, Renderer2, viewChild } from '@angular/core';

@Component({
    selector: 'prism-figma-panel',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './figma-panel.component.html',
    styleUrl: './figma-panel.component.css'
})
export class FigmaPanelComponent {
    private readonly renderer = inject(Renderer2);
    private readonly iframe = viewChild<ElementRef>('iframe');

    readonly activeComponent = input<unknown>(null);

    protected readonly figmaUrl = computed(() => {
        const comp = this.activeComponent() as any;

        if (!comp) return null;
        const url = comp.meta?.showcaseConfig?.meta?.['figma'];

        return typeof url === 'string' ? url : null;
    });

    constructor() {
        effect(() => {
            const url = this.figmaUrl();
            const el = this.iframe()?.nativeElement;

            if (el && url) {
                this.renderer.setAttribute(el, 'src', `https://www.figma.com/embed?embed_host=ng-prism&url=${encodeURIComponent(url)}`);
            }
        });
    }
}
