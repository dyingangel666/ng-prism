import { ApplicationRef, Injector, runInInjectionContext } from '@angular/core';
import type { RuntimeManifest } from '../plugin/plugin.types.js';
import { PRISM_MANIFEST } from './tokens/prism-tokens.js';
import { PrismManifestService } from './services/prism-manifest.service.js';
import { enablePrismHmr } from './hmr.js';

function setup(initial: RuntimeManifest): { service: PrismManifestService; appRef: ApplicationRef } {
  const injector = Injector.create({
    providers: [{ provide: PRISM_MANIFEST, useValue: initial }],
  });
  const service = runInInjectionContext(injector, () => new PrismManifestService());
  const appRef = { injector: { get: () => service } } as unknown as ApplicationRef;
  return { service, appRef };
}

describe('enablePrismHmr', () => {
  it('should call updateManifest on the PrismManifestService', () => {
    const { service, appRef } = setup({ components: [] });
    const spy = jest.spyOn(service, 'updateManifest');

    const newManifest: RuntimeManifest = {
      components: [{
        type: class {} as any,
        meta: {
          className: 'NewOne',
          filePath: '/test.ts',
          showcaseConfig: { title: 'New' },
          inputs: [],
          outputs: [],
          componentMeta: { selector: 'x', standalone: true, isDirective: false },
        },
      }],
    };

    enablePrismHmr(appRef, newManifest);

    expect(spy).toHaveBeenCalledWith(newManifest);
  });

  it('should update components exposed via the service', () => {
    const { service, appRef } = setup({ components: [] });

    const newComp = {
      type: class {} as any,
      meta: {
        className: 'Added',
        filePath: '/test.ts',
        showcaseConfig: { title: 'Added' },
        inputs: [],
        outputs: [],
        componentMeta: { selector: 'x', standalone: true, isDirective: false },
      },
    };

    enablePrismHmr(appRef, { components: [newComp] });

    expect(service.components()).toEqual([newComp]);
  });
});
