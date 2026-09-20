import type {
  NavigationDecorationDefinition,
  PanelBadge,
  RuntimeComponent,
} from '@ng-prism/core/plugin';
import type { VrtComponentMeta } from './visual-regression.types.js';
import { isReviewStatus } from './vrt-summarize.js';

/**
 * The runtime contributions both entry points declare.
 *
 * `visual-regression-plugin.ts` carries the build-time hooks and must never be
 * reachable from a browser bundle, so the browser entry cannot import through
 * it — which used to mean the panel's visibility rule was written out twice,
 * once per entry, with nothing but `entry-parity.spec.ts` noticing if the two
 * drifted. This module is the half both can share: no `node:` imports, no
 * Angular, just the predicates the panel definition needs.
 */

function componentMeta(component: RuntimeComponent): VrtComponentMeta | null {
  return (
    (component.meta?.showcaseConfig?.meta?.['visualRegression'] as
      | VrtComponentMeta
      | undefined) ?? null
  );
}

/** True when the plugin recorded at least one result for this component. */
export function hasResults(component: RuntimeComponent): boolean {
  const meta = componentMeta(component);
  return Boolean(meta?.found && meta.variants.length > 0);
}

/**
 * How many of this component's variants are waiting on a person.
 *
 * The same set the panel's first group holds, decided by the same predicate,
 * so the number on the tab and the number in the group header cannot disagree.
 * Red once anything actually changed, amber while the only open items are ones
 * that could not be compared — resized and new. Null when there is nothing to
 * say, which is what keeps a clean component's tab free of a green "0".
 *
 * One pass over the variants rather than a call to `groupRows`. The panel host
 * invokes this from its template, so it re-runs on every change-detection pass
 * for every visible tab, and `PanelDefinition.badge` asks for cheap and pure
 * on exactly those grounds — building all three groups to read the count
 * of one allocates a group per call and filters the list five times over.
 */
export function reviewBadge(component: RuntimeComponent): PanelBadge | null {
  const meta = componentMeta(component);
  if (!meta?.found) return null;

  let count = 0;
  let changed = false;
  for (const variant of meta.variants) {
    if (!isReviewStatus(variant.status)) continue;
    count++;
    if (variant.status === 'changed') changed = true;
  }
  if (count === 0) return null;

  return { text: String(count), variant: changed ? 'danger' : 'warn' };
}

/**
 * The navigation marker. Reads the same pre-derived `summary` the component
 * head shows, so the sidebar and the head cannot disagree about a component.
 */
export const VRT_NAVIGATION_DECORATION: NavigationDecorationDefinition = {
  id: 'visual-regression',
  icon: 'camera',
  order: 20,
  badge: (component) => {
    const meta = componentMeta(component);
    if (!meta?.found || !meta.summary) return null;
    if (meta.summary.variant === 'ok') return null;
    return { variant: meta.summary.variant, label: meta.summary.label };
  },
};
