import type { NgPrismPlugin, PrismManifest, ScannedComponent } from '../../plugin/plugin.types.js';
import type { StyleguidePage } from '../../plugin/page.types.js';

export async function runPluginHooks(
  manifest: PrismManifest,
  plugins: NgPrismPlugin[],
): Promise<PrismManifest> {
  let components = [...manifest.components];

  for (const comp of components) {
    let current: ScannedComponent = comp;
    for (const plugin of plugins) {
      if (plugin.onComponentScanned) {
        const result = await plugin.onComponentScanned(current);
        if (result) {
          current = result;
        }
      }
    }
    components[components.indexOf(comp)] = current;
  }

  let pages = [...(manifest.pages ?? [])];

  for (let i = 0; i < pages.length; i++) {
    let current: StyleguidePage = pages[i];
    for (const plugin of plugins) {
      if (plugin.onPageScanned) {
        const result = await plugin.onPageScanned(current);
        if (result) {
          current = result;
        }
      }
    }
    pages[i] = current;
  }

  let result: PrismManifest = { components, pages };

  for (const plugin of plugins) {
    if (plugin.onManifestReady) {
      const updated = await plugin.onManifestReady(result);
      if (updated) {
        result = updated;
      }
    }
  }

  return result;
}
