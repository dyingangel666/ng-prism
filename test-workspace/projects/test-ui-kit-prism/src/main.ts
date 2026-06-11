import { bootstrapApplication } from '@angular/platform-browser';
import {
  enablePrismHmr,
  PrismShellComponent,
  providePrism,
} from '@ng-prism/core';
import { PRISM_RUNTIME_MANIFEST } from 'prism-manifest/test-ui-kit-prism';
import config from 'ng-prism.config';

const hot = (
  import.meta as ImportMeta & {
    hot?: {
      accept(
        dep: string,
        cb: (
          mod:
            | { PRISM_RUNTIME_MANIFEST: typeof PRISM_RUNTIME_MANIFEST }
            | undefined
        ) => void
      ): void;
    };
  }
).hot;

bootstrapApplication(PrismShellComponent, {
  providers: [providePrism(PRISM_RUNTIME_MANIFEST, config)],
}).then((appRef) => {
  hot?.accept('prism-manifest/test-ui-kit-prism', (mod) => {
    if (mod) enablePrismHmr(appRef, mod.PRISM_RUNTIME_MANIFEST);
  });
});
