// Tokens
// PRISM_RENDERER_HOOKS + PrismRendererHooks are exported from the plugin entry point
// (src/plugin/index.ts) since they belong to the plugin API surface.
export {
  PRISM_MANIFEST,
  PRISM_CONFIG,
} from './tokens/prism-tokens.js';

// Theme
export {
  PRISM_DEFAULT_THEME,
  PRISM_DARK_THEME,
  PRISM_LIGHT_THEME,
  PRISM_BASE_TOKENS,
} from './theme/prism-default-theme.js';
export { PrismThemeService } from './services/prism-theme.service.js';

// Types
export type { NavigationItem } from './services/navigation-item.types.js';

// Services
export { PrismManifestService } from './services/prism-manifest.service.js';
export { PrismSearchService } from './services/prism-search.service.js';
export { PrismNavigationService } from './services/prism-navigation.service.js';
export { PrismRendererService } from './services/prism-renderer.service.js';
export {
  PrismEventLogService,
  type EventLogEntry,
} from './services/prism-event-log.service.js';
export { PrismPluginService } from './services/prism-plugin.service.js';
export { PrismLayoutService } from './services/prism-layout.service.js';
export { PrismUrlStateService } from './services/prism-url-state.service.js';
export { PrismPersistenceService } from './services/prism-persistence.service.js';

// Shell (root component)
export { PrismShellComponent } from './shell/prism-shell.component.js';

// Page renderers
export { PrismPageRendererComponent } from './page-renderer/prism-page-renderer.component.js';

// Bootstrap helper
export { providePrism } from './provide-prism.js';
export type { ProvidePrismOptions } from './provide-prism.js';

// HMR helper
export { enablePrismHmr } from './hmr.js';
