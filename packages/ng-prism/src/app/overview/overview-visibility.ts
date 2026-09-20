import type { RuntimeComponent } from '../../plugin/plugin.types.js';

/**
 * Whether the Overview tab is offered for this component.
 *
 * Two conditions, and the second is a correctness argument rather than taste.
 * A `renderPage` component does not render itself — it renders a registered
 * `ComponentPage`, and that page reads its values from the *global*
 * `PrismRendererService`. n cells side by side would all show the same state,
 * so an Overview there would be demonstrably wrong, not merely unhelpful.
 *
 * A single variant needs no contact sheet: the grid would be one cell, and the
 * Playground says the same thing better.
 */
export function showsOverview(component: RuntimeComponent): boolean {
  const config = component.meta.showcaseConfig;
  if (config.renderPage) return false;
  return (config.variants?.length ?? 0) >= 2;
}
