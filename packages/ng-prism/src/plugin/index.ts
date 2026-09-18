// Plugin API exports
export type {
  NgPrismPlugin,
  PanelBadge,
  PanelDefinition,
  ControlDefinition,
  HeaderWidgetDefinition,
  NavigationDecoration,
  NavigationDecorationDefinition,
  NgPrismConfig,
  PrismManifest,
  ScannedComponent,
  InputMeta,
  OutputMeta,
  RuntimeManifest,
  RuntimeComponent,
  DiscoveryManifest,
  DiscoveryComponent,
  DiscoveryVariant,
  DiscoveryPage,
} from './plugin.types.js';
export type {
  StyleguidePage,
  CustomPage,
  ComponentPage,
} from './page.types.js';

// The canvas background a variant renders on. Part of the discovery contract
// (`DiscoveryVariant.bg`), so external tooling and plugins can name the type
// and resolve the declaration the same way the app does.
export type { CanvasBg } from '../shared/canvas-bg.type.js';
export { CANVAS_BGS } from '../shared/canvas-bg.type.js';
export { DEFAULT_VARIANT_BG, resolveVariantBg } from '../shared/variant-bg.js';
export type { VariantBgSource } from '../shared/variant-bg.js';
export { customPage, componentPage } from './page-helpers.js';
export type { ComponentPageOptions } from './page-helpers.js';
export { defineConfig } from './define-config.js';
// From the dependency-free registry module, not `prism-icon.component.js` —
// that file also exports an `@Component` class, which would pull
// `@angular/core` into this barrel's graph. The builder evaluates plugin
// config (and everything it imports) in Node.js, so nothing Angular may be
// reachable from here.
export { ICON_NAMES } from '../app/icons/icon-registry.js';
export {
  PRISM_RENDERER_HOOKS,
  PRISM_MANIFEST,
  PRISM_CONFIG,
} from '../app/tokens/prism-tokens.js';
export type { PrismRendererHooks } from '../app/tokens/prism-tokens.js';
