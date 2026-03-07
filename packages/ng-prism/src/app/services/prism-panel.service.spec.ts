import { PrismPanelService } from './prism-panel.service.js';

describe('PrismPanelService', () => {
  let service: PrismPanelService;

  beforeEach(() => {
    service = new PrismPanelService();
  });

  it('defaults activePanelId to "controls"', () => {
    expect(service.activePanelId()).toBe('controls');
  });

  it('updates activePanelId when set', () => {
    service.activePanelId.set('box-model');
    expect(service.activePanelId()).toBe('box-model');
  });
});
