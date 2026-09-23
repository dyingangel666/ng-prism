import { InjectionToken } from '@angular/core';

export interface FigmaPluginOptions {
  /**
   * Figma personal access token. Only needed by the Design Diff panel, which
   * uses it to fetch node images via the Figma REST API.
   */
  accessToken?: string;
  /**
   * Registers the Design Diff panel. Opt-in — without it only the Figma embed
   * panel is registered. Requires `accessToken` to actually run a diff.
   *
   * @default false
   */
  designDiff?: boolean;
}

export const FIGMA_PLUGIN_CONFIG = new InjectionToken<FigmaPluginOptions>(
  'FIGMA_PLUGIN_CONFIG'
);
