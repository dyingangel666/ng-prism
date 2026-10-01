import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { BoxModelStateService } from './box-model-state.service.js';
import type { BoxModelData } from './box-model.types.js';

@Component({
    selector: 'prism-box-model-panel',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './box-model-panel.component.html',
    styleUrl: './box-model-panel.component.css'
})
export class BoxModelPanelComponent {
    protected readonly stateService = inject(BoxModelStateService);

    readonly activeComponent = input<unknown>(null);

    fmt(value: number): string {
        return value === 0 ? '-' : `${value}`;
    }

    contentW(bm: BoxModelData): string {
        return String(Math.round(bm.content.width - bm.border.left - bm.border.right - bm.padding.left - bm.padding.right));
    }

    contentH(bm: BoxModelData): string {
        return String(Math.round(bm.content.height - bm.border.top - bm.border.bottom - bm.padding.top - bm.padding.bottom));
    }
}
