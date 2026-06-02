// Plugin API exports
export type {
  NgPrismPlugin,
  PanelDefinition,
  ControlDefinition,
  HeaderWidgetDefinition,
  NgPrismConfig,
  PrismManifest,
  ScannedComponent,
  InputMeta,
  OutputMeta,
  RuntimeManifest,
  RuntimeComponent,
} from './plugin.types.js';
export type {
  StyleguidePage,
  CustomPage,
  ComponentPage,
} from './page.types.js';
export { customPage, componentPage } from './page-helpers.js';
export type { ComponentPageOptions } from './page-helpers.js';
export { defineConfig } from './define-config.js';
export {
  PRISM_RENDERER_HOOKS,
  PRISM_MANIFEST,
  PRISM_CONFIG,
} from '../app/tokens/prism-tokens.js';
export type { PrismRendererHooks } from '../app/tokens/prism-tokens.js';
