import type { Type } from '@angular/core';
import type { PanelDefinition } from '../../plugin/plugin.types.js';

/** What the renderer should show in the overlay slot inside `.demo-wrap`. */
export type OverlayResolution =
  | { kind: 'none' }
  | { kind: 'eager'; component: Type<unknown> }
  | {
      kind: 'lazy';
      panelId: string;
      load: () => Promise<Type<unknown>>;
    };

const NONE: OverlayResolution = { kind: 'none' };

/**
 * Decides which overlay component belongs to the active panel.
 *
 * Panel overlays render *inside* `.demo-wrap` — the same element external
 * screenshot tools capture — so capture mode resolves to `none` regardless of
 * which panel is active, and never triggers a lazy overlay load.
 */
export function resolveOverlay(
  panels: readonly PanelDefinition[],
  activePanelId: string,
  options: {
    captureActive: boolean;
    cache: ReadonlyMap<string, Type<unknown>>;
  }
): OverlayResolution {
  if (options.captureActive) return NONE;

  const panel = panels.find((p) => p.id === activePanelId);
  if (!panel) return NONE;

  if (panel.overlayComponent) {
    return { kind: 'eager', component: panel.overlayComponent };
  }

  if (panel.loadOverlayComponent) {
    const cached = options.cache.get(panel.id);
    const loadOverlayComponent = panel.loadOverlayComponent;
    return cached
      ? { kind: 'eager', component: cached }
      : {
          kind: 'lazy',
          panelId: panel.id,
          // Wrapped rather than passed by reference: handing the bare method
          // over detaches it from its panel, and the renderer would call it
          // with `this === undefined`. A definition written in method
          // shorthand that reads its own object then throws inside a promise
          // the renderer does not catch, and the overlay silently never
          // appears.
          load: () => loadOverlayComponent.call(panel),
        };
  }

  return NONE;
}
