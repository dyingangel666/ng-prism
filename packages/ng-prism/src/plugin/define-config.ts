import type { NgPrismConfig } from './plugin.types.js';

/** Identity helper for TypeScript type safety on ng-prism.config.ts */
export function defineConfig(config: NgPrismConfig): NgPrismConfig {
  return config;
}
