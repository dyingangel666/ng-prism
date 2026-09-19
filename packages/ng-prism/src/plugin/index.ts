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
// From the dependency-free registry module, not `prism-icon.component.js`.
// The builder evaluates plugin config — and everything it imports — in
// Node.js, and importing the component module would run an `@Component`
// decorator there: template compilation, styles, the whole runtime.
//
// Not a blanket "no Angular below this line": `prism-tokens.js` a few lines
// down imports `InjectionToken`, and evaluating a plain class constructor in
// Node is harmless. The line being drawn is decorated declarations, not the
// package.
export { ICON_NAMES } from '../app/icons/icon-registry.js';
export {
  PRISM_RENDERER_HOOKS,
  PRISM_MANIFEST,
  PRISM_CONFIG,
} from '../app/tokens/prism-tokens.js';
export type { PrismRendererHooks } from '../app/tokens/prism-tokens.js';

// Shared presentational components for plugin contributions.
export { PrismMetricBadgeComponent } from '../app/shared/prism-metric-badge.component.js';
export { PrismIconComponent } from '../app/icons/prism-icon.component.js';
