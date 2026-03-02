import { PrismLayoutService } from './prism-layout.service.js';

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(global, 'localStorage', { value: localStorageMock, writable: true });

function createService(): PrismLayoutService {
  return new PrismLayoutService();
}

describe('PrismLayoutService', () => {
  beforeEach(() => localStorage.clear());

  it('should default to all panels visible', () => {
    const s = createService();
    expect(s.sidebarVisible()).toBe(true);
    expect(s.addonsVisible()).toBe(true);
    expect(s.toolbarVisible()).toBe(true);
  });

  it('should toggle sidebar', () => {
    const s = createService();
    s.toggleSidebar();
    expect(s.sidebarVisible()).toBe(false);
    s.toggleSidebar();
    expect(s.sidebarVisible()).toBe(true);
  });

  it('should toggle addons', () => {
    const s = createService();
    s.toggleAddons();
    expect(s.addonsVisible()).toBe(false);
  });

  it('should toggle toolbar', () => {
    const s = createService();
    s.toggleToolbar();
    expect(s.toolbarVisible()).toBe(false);
  });

  it('should default to bottom orientation', () => {
    const s = createService();
    expect(s.addonsOrientation()).toBe('bottom');
  });

  it('should cycle orientation between bottom and right', () => {
    const s = createService();
    s.toggleOrientation();
    expect(s.addonsOrientation()).toBe('right');
    s.toggleOrientation();
    expect(s.addonsOrientation()).toBe('bottom');
  });

  it('should clamp sidebar width to [160, 600]', () => {
    const s = createService();
    s.setSidebarWidth(50);
    expect(s.sidebarWidth()).toBe(160);
    s.setSidebarWidth(9999);
    expect(s.sidebarWidth()).toBe(600);
    s.setSidebarWidth(320);
    expect(s.sidebarWidth()).toBe(320);
  });

  it('should clamp panel height to [100, 600]', () => {
    const s = createService();
    s.setPanelHeight(20);
    expect(s.panelHeight()).toBe(100);
    s.setPanelHeight(9999);
    expect(s.panelHeight()).toBe(600);
  });

  it('should clamp panel width to [200, 600]', () => {
    const s = createService();
    s.setPanelWidth(50);
    expect(s.panelWidth()).toBe(200);
    s.setPanelWidth(9999);
    expect(s.panelWidth()).toBe(600);
  });

  it('should persist state to localStorage on mutation', () => {
    const s = createService();
    s.toggleSidebar();
    s.setSidebarWidth(340);
    const stored = JSON.parse(localStorage.getItem('ng-prism-layout')!);
    expect(stored.sidebarVisible).toBe(false);
    expect(stored.sidebarWidth).toBe(340);
  });

  it('should restore state from localStorage on construction', () => {
    localStorage.setItem('ng-prism-layout', JSON.stringify({
      sidebarVisible: false,
      sidebarWidth: 360,
      addonsOrientation: 'right',
    }));
    const s = createService();
    expect(s.sidebarVisible()).toBe(false);
    expect(s.sidebarWidth()).toBe(360);
    expect(s.addonsOrientation()).toBe('right');
  });

  it('should ignore malformed localStorage data', () => {
    localStorage.setItem('ng-prism-layout', 'not-json');
    expect(() => createService()).not.toThrow();
  });
});
