import { InjectionToken } from '@angular/core';

export interface FigmaPluginOptions {
  accessToken?: string;
}

export const FIGMA_PLUGIN_CONFIG = new InjectionToken<FigmaPluginOptions>('FIGMA_PLUGIN_CONFIG');
