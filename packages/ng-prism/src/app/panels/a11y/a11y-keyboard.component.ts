import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { PrismRendererService } from '../../services/prism-renderer.service.js';
import { A11yKeyboardService } from './a11y-keyboard.service.js';

@Component({
    selector: 'prism-a11y-keyboard',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './a11y-keyboard.component.html',
    styleUrl: './a11y-keyboard.component.css'
})
export class A11yKeyboardComponent {
    protected readonly rendererService = inject(PrismRendererService);
    private readonly keyboardService = inject(A11yKeyboardService);

    protected readonly items = computed(() => {
        const root = this.rendererService.renderedElement();

        if (!root) return [];
        const doc = (root as HTMLElement).ownerDocument;

        return this.keyboardService.extractTabOrder(root, doc ? (id) => doc.getElementById(id) : undefined);
    });

    protected typeAttr(el: Element): string {
        const type = el.getAttribute('type');

        return type ? `[type=${type}]` : '';
    }
}
