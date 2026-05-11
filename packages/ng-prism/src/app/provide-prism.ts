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
