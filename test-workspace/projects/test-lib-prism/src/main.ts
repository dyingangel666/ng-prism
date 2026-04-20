import { bootstrapApplication } from '@angular/platform-browser';
import { PrismShellComponent, providePrism } from '@ng-prism/core';
import { ButtonTooltipPageComponent } from '../../test-lib/src/lib/directives/tooltip/button-tooltip-page.component';
import { DesignTokensPageComponent } from './pages/design-tokens-page.component';
import { GettingStartedPageComponent } from './pages/getting-started-page.component';
import { ButtonPatternsPageComponent } from './pages/button-patterns-page.component';
import { PRISM_RUNTIME_MANIFEST } from './prism-manifest';
import config from 'ng-prism.config';

bootstrapApplication(PrismShellComponent, {
  providers: [
    providePrism(PRISM_RUNTIME_MANIFEST, config, {
      componentPages: [
        {
          title: 'Getting Started',
          category: 'Guides',
          component: GettingStartedPageComponent,
          order: 1,
          categoryOrder: 0,
        },
        {
          title: 'Design Tokens',
          category: 'Guides',
          component: DesignTokensPageComponent,
          order: 2,
        },
        {
          title: 'Button Patterns',
          category: 'Components / Inputs',
          component: ButtonPatternsPageComponent,
        },
        {
          title: 'Button + Tooltip',
          category: 'Patterns',
          component: ButtonTooltipPageComponent,
        },
      ],
    }),
  ],
});
