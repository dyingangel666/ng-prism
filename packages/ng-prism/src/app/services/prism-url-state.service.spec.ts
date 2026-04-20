import { TestBed } from '@angular/core/testing';
import { ApplicationRef } from '@angular/core';
import type { RuntimeComponent, RuntimeManifest, NgPrismConfig } from '../../plugin/plugin.types.js';
import { PRISM_CONFIG, PRISM_MANIFEST } from '../tokens/prism-tokens.js';
import { PrismNavigationService } from './prism-navigation.service.js';
import { PrismPanelService } from './prism-panel.service.js';
import { PrismRendererService } from './prism-renderer.service.js';
import { PrismUrlStateService } from './prism-url-state.service.js';

function createComponent(
  overrides: Partial<{ className: string; title: string; variants: { name: string }[] }> = {},
): RuntimeComponent {
  return {
    type: class {} as any,
    meta: {
      className: overrides.className ?? 'Comp',
      filePath: '/test.ts',
      showcaseConfig: {
        title: overrides.title ?? 'Default',
        variants: overrides.variants,
      },
      inputs: [],
      outputs: [],
      componentMeta: { selector: 'test', standalone: true, isDirective: false },
    },
  };
}

function setUrl(search: string): void {
  window.history.replaceState({}, '', `/${search}`);
}

function flush(): void {
  TestBed.inject(ApplicationRef).tick();
}

function setup(manifest: RuntimeManifest, config: NgPrismConfig = {}): {
  url: PrismUrlStateService;
  nav: PrismNavigationService;
  renderer: PrismRendererService;
  panel: PrismPanelService;
} {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      { provide: PRISM_MANIFEST, useValue: manifest },
      { provide: PRISM_CONFIG, useValue: config },
    ],
  });
  return {
    url: TestBed.inject(PrismUrlStateService),
    nav: TestBed.inject(PrismNavigationService),
    renderer: TestBed.inject(PrismRendererService),
    panel: TestBed.inject(PrismPanelService),
  };
}

describe('PrismUrlStateService', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/');
    jest.restoreAllMocks();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  describe('init - restore from URL', () => {
    it('should do nothing when URL has no params', () => {
      const comp = createComponent({ className: 'Foo' });
      const { url, nav } = setup({ components: [comp] });

      url.init();

      expect(nav.activeItem()).toBeNull();
    });

    it('should restore component by className', () => {
      const comp = createComponent({ className: 'SguiButton' });
      setUrl('?component=SguiButton');
      const { url, nav } = setup({ components: [comp] });

      url.init();

      expect(nav.activeComponent()).toBe(comp);
    });

    it('should restore variant index', () => {
      const comp = createComponent({
        className: 'SguiButton',
        variants: [{ name: 'V1' }, { name: 'V2' }, { name: 'V3' }],
      });
      setUrl('?component=SguiButton&variant=2');
      const { url, renderer } = setup({ components: [comp] });

      url.init();

      expect(renderer.activeVariantIndex()).toBe(2);
    });

    it('should restore page by title', () => {
      const page = { type: 'component' as const, title: 'ButtonPatterns', category: 'Docs', component: class {} as any };
      setUrl('?page=ButtonPatterns');
      const { url, nav } = setup({ components: [], pages: [page] });

      url.init();

      expect(nav.activePage()).toBe(page);
    });

    it('should restore view id', () => {
      setUrl('?view=api');
      const { url, panel } = setup({ components: [] });

      url.init();

      expect(panel.activeViewId()).toBe('api');
    });

    it('should ignore unknown component className without crashing', () => {
      const comp = createComponent({ className: 'Real' });
      setUrl('?component=Unknown');
      const { url, nav } = setup({ components: [comp] });

      url.init();

      expect(nav.activeComponent()).toBeNull();
    });

    it('should ignore out-of-range variant index', () => {
      const comp = createComponent({
        className: 'SguiButton',
        variants: [{ name: 'V1' }],
      });
      setUrl('?component=SguiButton&variant=99');
      const { url, renderer } = setup({ components: [comp] });

      url.init();

      expect(renderer.activeVariantIndex()).toBe(0);
    });

    it('should ignore NaN variant value', () => {
      const comp = createComponent({
        className: 'SguiButton',
        variants: [{ name: 'V1' }, { name: 'V2' }],
      });
      setUrl('?component=SguiButton&variant=abc');
      const { url, renderer } = setup({ components: [comp] });

      url.init();

      expect(renderer.activeVariantIndex()).toBe(0);
    });
  });

  describe('init - write to URL', () => {
    it('should write component className to URL on select', () => {
      const comp = createComponent({ className: 'SguiButton' });
      const { url, nav } = setup({ components: [comp] });

      url.init();
      nav.select(comp);
      flush();

      expect(window.location.search).toBe('?component=SguiButton');
    });

    it('should write variant only when > 0', () => {
      const comp = createComponent({
        className: 'SguiButton',
        variants: [{ name: 'V1' }, { name: 'V2' }],
      });
      const { url, nav, renderer } = setup({ components: [comp] });

      url.init();
      nav.select(comp);
      flush();
      expect(window.location.search).toBe('?component=SguiButton');

      renderer.activeVariantIndex.set(1);
      flush();
      expect(window.location.search).toBe('?component=SguiButton&variant=1');

      renderer.activeVariantIndex.set(0);
      flush();
      expect(window.location.search).toBe('?component=SguiButton');
    });

    it('should write view only when != renderer', () => {
      const comp = createComponent({ className: 'SguiButton' });
      const { url, nav, panel } = setup({ components: [comp] });

      url.init();
      nav.select(comp);
      panel.activeViewId.set('api');
      flush();

      expect(window.location.search).toBe('?component=SguiButton&view=api');
    });

    it('should write page title instead of component', () => {
      const page = { type: 'component' as const, title: 'Patterns', category: 'Docs', component: class {} as any };
      const { url, nav } = setup({ components: [], pages: [page] });

      url.init();
      nav.selectPage(page);
      flush();

      expect(window.location.search).toBe('?page=Patterns');
    });
  });

  describe('history API behavior', () => {
    it('should use pushState when component changes', () => {
      const a = createComponent({ className: 'A' });
      const b = createComponent({ className: 'B' });
      const pushSpy = jest.spyOn(window.history, 'pushState');
      const { url, nav } = setup({ components: [a, b] });

      url.init();
      nav.select(a);
      flush();
      pushSpy.mockClear();

      nav.select(b);
      flush();

      expect(pushSpy).toHaveBeenCalledTimes(1);
    });

    it('should use replaceState when variant changes', () => {
      const comp = createComponent({
        className: 'A',
        variants: [{ name: 'V1' }, { name: 'V2' }],
      });
      const replaceSpy = jest.spyOn(window.history, 'replaceState');
      const { url, nav, renderer } = setup({ components: [comp] });

      url.init();
      nav.select(comp);
      flush();
      replaceSpy.mockClear();

      renderer.activeVariantIndex.set(1);
      flush();

      expect(replaceSpy).toHaveBeenCalledTimes(1);
    });

    it('should use replaceState when view changes', () => {
      const comp = createComponent({ className: 'A' });
      const replaceSpy = jest.spyOn(window.history, 'replaceState');
      const { url, nav, panel } = setup({ components: [comp] });

      url.init();
      nav.select(comp);
      flush();
      replaceSpy.mockClear();

      panel.activeViewId.set('api');
      flush();

      expect(replaceSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('popstate handling', () => {
    it('should re-read URL on popstate event', () => {
      const a = createComponent({ className: 'A' });
      const b = createComponent({ className: 'B' });
      const { url, nav } = setup({ components: [a, b] });

      url.init();
      nav.select(a);
      flush();

      setUrl('?component=B');
      window.dispatchEvent(new PopStateEvent('popstate'));

      expect(nav.activeComponent()).toBe(b);
    });
  });

  describe('opt-out via config', () => {
    it('should not register effect when config.urlState is false', () => {
      const comp = createComponent({ className: 'A' });
      const pushSpy = jest.spyOn(window.history, 'pushState');
      const { url, nav } = setup({ components: [comp] }, { urlState: false });

      url.init();
      nav.select(comp);
      flush();

      expect(pushSpy).not.toHaveBeenCalled();
      expect(window.location.search).toBe('');
    });

    it('should not restore from URL when config.urlState is false', () => {
      const comp = createComponent({ className: 'A' });
      setUrl('?component=A');
      const { url, nav } = setup({ components: [comp] }, { urlState: false });

      url.init();

      expect(nav.activeComponent()).toBeNull();
    });
  });

  describe('suppressSync', () => {
    it('should not re-write URL during restoreFromUrl', () => {
      const comp = createComponent({ className: 'A' });
      setUrl('?component=A');
      const pushSpy = jest.spyOn(window.history, 'pushState');
      const replaceSpy = jest.spyOn(window.history, 'replaceState');
      const { url } = setup({ components: [comp] });

      url.init();
      flush();

      expect(pushSpy).not.toHaveBeenCalled();
      expect(replaceSpy).not.toHaveBeenCalled();
    });
  });
});
