import { InjectionToken } from '@angular/core';
import type { NgPrismConfig, RuntimeManifest } from '../../plugin/plugin.types.js';

export const PRISM_MANIFEST = new InjectionToken<RuntimeManifest>('PRISM_MANIFEST');

export const PRISM_CONFIG = new InjectionToken<NgPrismConfig>('PRISM_CONFIG', {
  providedIn: 'root',
  factory: () => ({}),
});
