import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { A11yAuditService } from './a11y-audit.service.js';
import { A11yScoreComponent } from './a11y-score.component.js';

const IMPACT_ORDER: Record<string, number> = {
    critical: 0,
    serious: 1,
    moderate: 2,
    minor: 3
};

const IMPACT_COLOR: Record<string, string> = {
    critical: 'var(--prism-danger)',
    serious: '#fb923c',
    moderate: 'var(--prism-warn)',
    minor: 'var(--prism-text-muted)'
};

function sevColor(impact: string | null | undefined): string {
    return IMPACT_COLOR[impact ?? ''] ?? 'var(--prism-success)';
}

@Component({
    selector: 'prism-a11y-violations',
    standalone: true,
    imports: [A11yScoreComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './a11y-violations.component.html',
    styleUrl: './a11y-violations.component.css'
})
export class A11yViolationsComponent {
    protected readonly auditService = inject(A11yAuditService);

    protected readonly scoreResult = computed(() => this.auditService.scoreResult());

    protected readonly allResults = computed(() => {
        const results = this.auditService.results();
        if (!results) return [];
        const violations = [...results.violations].sort((a, b) => (IMPACT_ORDER[a.impact ?? ''] ?? 4) - (IMPACT_ORDER[b.impact ?? ''] ?? 4));
        const passes = results.passes.slice(0, 4);
        return [...violations, ...passes];
    });

    protected sevColor(impact: string | null | undefined): string {
        return sevColor(impact);
    }
}
