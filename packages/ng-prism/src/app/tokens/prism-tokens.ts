import { InjectionToken } from '@angular/core';
import type {
  NgPrismConfig,
  PanelDefinition,
  RuntimeManifest,
} from '../../plugin/plugin.types.js';

export const PRISM_MANIFEST = new InjectionToken<RuntimeManifest>('PRISM_MANIFEST');

export const PRISM_CONFIG = new InjectionToken<NgPrismConfig>('PRISM_CONFIG', {
  providedIn: 'root',
  factory: () => ({}),
});

export interface PrismRendererHooks {
  onBeforeCreate?(selector: string): void;
  onAfterCreate?(selector: string): void;
  onAfterDestroy?(selector: string): void;
}

export const PRISM_RENDERER_HOOKS =
  new InjectionToken<PrismRendererHooks>('PRISM_RENDERER_HOOKS');

export const PRISM_BUILTIN_PANELS = new InjectionToken<PanelDefinition[]>(
  'PRISM_BUILTIN_PANELS',
  { providedIn: 'root', factory: () => [] }
);
