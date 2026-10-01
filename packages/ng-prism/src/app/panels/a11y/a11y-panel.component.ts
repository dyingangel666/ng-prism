import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import type { RuntimeComponent } from '../../../plugin/plugin.types.js';
import { A11yAuditService } from './a11y-audit.service.js';
import { A11yKeyboardComponent } from './a11y-keyboard.component.js';
import { A11yPanelStateService } from './a11y-panel-state.service.js';
import { A11ySrComponent } from './a11y-sr.component.js';
import { A11yTreeComponent } from './a11y-tree.component.js';
import { A11yViolationsComponent } from './a11y-violations.component.js';
import type { A11yCoreConfig } from './a11y.types.js';

@Component({
    selector: 'prism-a11y-panel',
    standalone: true,
    imports: [A11yViolationsComponent, A11yKeyboardComponent, A11yTreeComponent, A11ySrComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './a11y-panel.component.html',
    styleUrl: './a11y-panel.component.css'
})
export class A11yPanelComponent {
    private readonly auditService = inject(A11yAuditService);
    protected readonly state = inject(A11yPanelStateService);

    readonly activeComponent = input<RuntimeComponent | null>(null);

    protected readonly disabled = computed(() => {
        const comp = this.activeComponent();
        const config = comp?.meta.showcaseConfig.meta?.['a11y'] as A11yCoreConfig | undefined;

        return config?.disable === true;
    });

    protected readonly violationCount = computed(() => {
        const r = this.auditService.results();

        return r ? r.violations.length : null;
    });
}
