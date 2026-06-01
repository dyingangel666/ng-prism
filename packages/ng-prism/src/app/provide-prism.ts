import { makeEnvironmentProviders, type EnvironmentProviders } from '@angular/core';
import { provideHighlightOptions } from 'ngx-highlightjs';
import type { NgPrismConfig, RuntimeManifest } from '../plugin/plugin.types.js';
import type { ComponentPageOptions } from '../plugin/page-helpers.js';
import { componentPage } from '../plugin/page-helpers.js';
import { BUILTIN_PANELS } from './panels/builtin-panels.js';
import {
  PRISM_BUILTIN_PANELS,
  PRISM_CONFIG,
  PRISM_MANIFEST,
} from './tokens/prism-tokens.js';

export interface ProvidePrismOptions {
  componentPages?: ComponentPageOptions[];
}

export function providePrism(
  manifest: RuntimeManifest,
  config?: NgPrismConfig,
  options?: ProvidePrismOptions,
): EnvironmentProviders {
  const mergedManifest: RuntimeManifest = options?.componentPages?.length
    ? { ...manifest, pages: [...(manifest.pages ?? []), ...options.componentPages.map(o => componentPage(o))] }
    : manifest;

  // Expose a thin discovery view of the manifest to audit tooling (e.g. ng-prism-audit-a11y).
  // We intentionally only expose className + variant info — no Angular type references.
  if (typeof globalThis !== 'undefined') {
    (globalThis as Record<string, unknown>)['__PRISM_MANIFEST__'] = {
      components: mergedManifest.components.map((c) => ({
        className: c.meta.className,
        variants: c.meta.showcaseConfig.variants?.map((v, i) => ({ name: v.name, index: i })) ?? [{ name: 'Default', index: 0 }],
      })),
      pages: (mergedManifest.pages ?? []).map((p) => ({ title: p.title })),
    };
  }

  return makeEnvironmentProviders([
    { provide: PRISM_MANIFEST, useValue: mergedManifest },
    { provide: PRISM_BUILTIN_PANELS, useValue: BUILTIN_PANELS },
    ...(config ? [{ provide: PRISM_CONFIG, useValue: config }] : []),
    ...(config?.appProviders ?? []),
    provideHighlightOptions({
      coreLibraryLoader: () => import('highlight.js/lib/core'),
      languages: {
        xml: () => import('highlight.js/lib/languages/xml'),
        typescript: () => import('highlight.js/lib/languages/typescript'),
      },
    }),
  ]);
}
