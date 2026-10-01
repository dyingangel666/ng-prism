import { ChangeDetectionStrategy, Component, effect, ElementRef, inject, signal } from '@angular/core';
import { PrismRendererService } from '../../services/prism-renderer.service.js';
import { A11yKeyboardService } from './a11y-keyboard.service.js';
import { A11yPanelStateService } from './a11y-panel-state.service.js';

export interface BadgePosition {
    index: number;
    name: string;
    role: string;
    x: number;
    y: number;
    width: number;
    height: number;
}

@Component({
    selector: 'prism-a11y-kbd-overlay',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './a11y-keyboard-overlay.component.html',
    styleUrl: './a11y-keyboard-overlay.component.css'
})
export class A11yKeyboardOverlayComponent {
    protected readonly panelState = inject(A11yPanelStateService);
    private readonly rendererService = inject(PrismRendererService);
    private readonly keyboardService = inject(A11yKeyboardService);
    private readonly elementRef = inject(ElementRef<HTMLElement>);

    protected readonly badges = signal<BadgePosition[]>([]);

    private rafId: number | null = null;

    constructor() {
        effect(() => {
            const root = this.rendererService.renderedElement();

            this.rendererService.inputValues();
            this.rendererService.activeVariantIndex();
            const isKeyboard = this.panelState.activeTab() === 'keyboard';

            if (!root || !isKeyboard) {
                this.badges.set([]);
                return;
            }

            if (this.rafId !== null) cancelAnimationFrame(this.rafId);
            this.rafId = requestAnimationFrame(() => {
                this.rafId = null;
                this.computeBadges(root);
            });
        });
    }

    private computeBadges(root: Element): void {
        const canvas = this.elementRef.nativeElement.closest('.prism-canvas-stage') as HTMLElement | null;

        if (!canvas) return;

        const doc = (root as HTMLElement).ownerDocument;
        const items = this.keyboardService.extractTabOrder(root, doc ? (id) => doc.getElementById(id) : undefined);

        const canvasRect = canvas.getBoundingClientRect();
        const scrollLeft = canvas.scrollLeft;
        const scrollTop = canvas.scrollTop;

        const positions: BadgePosition[] = items.map((item) => {
            const elRect = (item.element as HTMLElement).getBoundingClientRect();

            return {
                index: item.index,
                name: item.name,
                role: item.role,
                x: elRect.left - canvasRect.left + scrollLeft,
                y: elRect.top - canvasRect.top + scrollTop,
                width: elRect.width,
                height: elRect.height
            };
        });

        this.badges.set(positions);
    }
}
