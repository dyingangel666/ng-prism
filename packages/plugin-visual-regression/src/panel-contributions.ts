import type { PanelBadge, RuntimeComponent } from '@ng-prism/core/plugin';
import type { VrtComponentMeta } from './visual-regression.types.js';
import { groupRows } from './vrt-summarize.js';

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
 * The same set the panel's first group holds, counted from the same function,
 * so the number on the tab and the number in the group header cannot disagree.
 * Red once anything actually changed, amber while the only open items are ones
 * that could not be compared — resized and new. Null when there is nothing to
 * say, which is what keeps a clean component's tab free of a green "0".
 */
export function reviewBadge(component: RuntimeComponent): PanelBadge | null {
  const meta = componentMeta(component);
  if (!meta?.found) return null;

  const review = groupRows(meta.variants).find(
    (group) => group.key === 'review'
  );
  if (!review) return null;

  return {
    text: String(review.count),
    variant: review.rows.some((row) => row.status === 'changed')
      ? 'danger'
      : 'warn',
  };
}
