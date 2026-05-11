import type { NgPrismConfig } from './plugin.types.js';

/** Identity helper for TypeScript type safety on ng-prism.config.ts */
export function defineConfig(config: NgPrismConfig): NgPrismConfig {
  warnOnDuplicatePluginNames(config);
  return config;
}

function warnOnDuplicatePluginNames(config: NgPrismConfig): void {
  if (!config.plugins?.length) return;

  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const plugin of config.plugins) {
    if (!plugin.name) continue;
    if (seen.has(plugin.name)) {
      duplicates.add(plugin.name);
    } else {
      seen.add(plugin.name);
    }
  }

  for (const name of duplicates) {
    console.warn(
      `⚠ ng-prism: plugin "${name}" is registered more than once — later hooks may overwrite earlier ones.`,
    );
  }
}
