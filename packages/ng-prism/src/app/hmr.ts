import type { ApplicationRef } from '@angular/core';
import type { RuntimeManifest } from '../plugin/plugin.types.js';
import { PrismManifestService } from './services/prism-manifest.service.js';

export function enablePrismHmr(appRef: ApplicationRef, newManifest: RuntimeManifest): void {
  const service = appRef.injector.get(PrismManifestService);
  service.updateManifest(newManifest);
}
