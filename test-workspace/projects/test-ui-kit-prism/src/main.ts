import { bootstrapApplication } from '@angular/platform-browser';
import { PrismShellComponent, providePrism } from '@ng-prism/core';
import { PRISM_RUNTIME_MANIFEST } from './prism-manifest';
import config from 'ng-prism.config';

bootstrapApplication(PrismShellComponent, {
  providers: [providePrism(PRISM_RUNTIME_MANIFEST, config)],
});
