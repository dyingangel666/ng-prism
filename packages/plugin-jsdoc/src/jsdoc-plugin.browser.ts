import type { NgPrismPlugin } from 'ng-prism/plugin';

export function jsDocPlugin(): NgPrismPlugin {
  return {
    name: '@ng-prism/plugin-jsdoc',
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
