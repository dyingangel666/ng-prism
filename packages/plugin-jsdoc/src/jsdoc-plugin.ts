import type { NgPrismPlugin } from 'ng-prism/plugin';
import { extractJsDocData } from './jsdoc-extractor.js';

export function jsDocPlugin(): NgPrismPlugin {
  return {
    name: '@ng-prism/plugin-jsdoc',
    async onComponentScanned(component) {
      const jsdoc = extractJsDocData(component.filePath, component.className);
      if (!jsdoc) return;
      return {
        ...component,
        showcaseConfig: {
          ...component.showcaseConfig,
          meta: { ...component.showcaseConfig.meta, jsdoc },
        },
      };
    },
    panels: [
      {
        id: 'jsdoc',
        label: 'API',
        loadComponent: () =>
          import('./jsdoc-panel.component.js').then((m) => m.JsDocPanelComponent),
        position: 'bottom',
      },
    ],
  };
}
