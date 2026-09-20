import type { PanelDefinition } from '../../plugin/plugin.types.js';

/**
 * The view to switch to, or `null` when the active one still stands.
 *
 * A view survives a component switch for as long as the new component still
 * offers it — that is the whole rule. `renderer` needs no check of its own
 * because it is the one view every component has: there is no `isVisible` for
 * the Playground, so it can never drop out of the visible list and never
 * needs a fallback away from itself.
 */
export function nextViewId(
  activeViewId: string,
  visibleViewPanels: readonly PanelDefinition[]
): string | null {
  if (activeViewId === 'renderer') return null;
  return visibleViewPanels.some((p) => p.id === activeViewId)
    ? null
    : 'renderer';
}
