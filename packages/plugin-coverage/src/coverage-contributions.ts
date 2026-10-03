import type { NavigationDecorationDefinition, PanelBadge, RuntimeComponent } from '@ng-prism/core/plugin';
import { deriveCoverageSummary } from './coverage-summary.js';
import type { CoverageData } from './coverage.types.js';

/**
 * The runtime contributions both entry points declare. `coverage-plugin.ts`
 * carries the build-time hook and must never be reachable from a browser
 * bundle, so the browser entry cannot import through it.
 */
function componentMeta(component: RuntimeComponent): CoverageData | null {
    return (component.meta?.showcaseConfig?.meta?.['coverage'] as CoverageData | undefined) ?? null;
}

/**
 * The score on the panel's own tab.
 *
 * Declared by the plugin because the core's built-in badge uses a fixed 90/70
 * scale and could show red where the navigation marker, which uses the
 * configured thresholds, shows amber. The build-time `summary` wins when
 * present; otherwise the badge is derived from `thresholds`.
 */
export function coverageBadge(component: RuntimeComponent): PanelBadge | null {
    const meta = componentMeta(component);

    if (!meta?.found) return null;

    const variant = meta.summary?.variant ?? (meta.thresholds ? deriveCoverageSummary(meta.score, meta.thresholds).variant : 'default');

    return { text: String(meta.score), variant };
}

export const COVERAGE_NAVIGATION_DECORATION: NavigationDecorationDefinition = {
    id: 'coverage',
    icon: 'shield-check',
    order: 30,
    badge: (component) => {
        const meta = componentMeta(component);

        if (!meta?.found || !meta.summary) return null;
        if (meta.summary.variant === 'ok') return null;
        return { variant: meta.summary.variant, label: meta.summary.label };
    }
};
