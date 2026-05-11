import {
  EnvironmentInjector,
  Injector,
  runInInjectionContext,
  signal,
} from '@angular/core';
import { PRISM_BUILTIN_PANELS } from '../tokens/prism-tokens.js';
import { PrismPanelService } from './prism-panel.service.js';
import { PrismPluginService } from './prism-plugin.service.js';

describe('PrismPanelService', () => {
  let service: PrismPanelService;

  beforeEach(() => {
    const pluginStub = { panels: signal([]).asReadonly() } as unknown as PrismPluginService;
    const injector = Injector.create({
      providers: [
        { provide: PrismPluginService, useValue: pluginStub },
        { provide: PRISM_BUILTIN_PANELS, useValue: [] },
        { provide: EnvironmentInjector, useValue: {} },
      ],
    });
    service = runInInjectionContext(injector, () => new PrismPanelService());
  });

  it('defaults activePanelId to "controls"', () => {
    expect(service.activePanelId()).toBe('controls');
  });

  it('updates activePanelId when set', () => {
    service.activePanelId.set('box-model');
    expect(service.activePanelId()).toBe('box-model');
  });

  it('returns null activePanelInjector when no panel matches', () => {
    expect(service.activePanelInjector()).toBeNull();
  });
});
