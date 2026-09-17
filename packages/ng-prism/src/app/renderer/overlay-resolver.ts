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
    return cached
      ? { kind: 'eager', component: cached }
      : { kind: 'lazy', panelId: panel.id, load: panel.loadOverlayComponent };
  }

  return NONE;
}
