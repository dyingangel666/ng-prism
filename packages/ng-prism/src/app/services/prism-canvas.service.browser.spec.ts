import { TestBed } from '@angular/core/testing';
import { PrismCanvasService } from './prism-canvas.service.js';

const STORAGE_KEY = 'ng-prism-canvas';

function setSearch(search: string): void {
  window.history.replaceState({}, '', `/${search}`);
}

function createService(): PrismCanvasService {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({});
  return TestBed.inject(PrismCanvasService);
}

describe('PrismCanvasService', () => {
  beforeEach(() => {
    localStorage.clear();
    setSearch('');
    document.documentElement.removeAttribute('data-prism-capture');
    document.getElementById('ng-prism-capture-styles')?.remove();
  });

  afterEach(() => {
    localStorage.clear();
    setSearch('');
  });

  describe('normal mode', () => {
    it('should restore persisted zoom', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ zoom: 2 }));
      expect(createService().zoom()).toBe(2);
    });

    it('should restore persisted guides', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ guides: true }));
      expect(createService().guides()).toBe(true);
    });

    it('should persist a zoom change', () => {
      const service = createService();
      service.setZoom(1.5);
      expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}').zoom).toBe(
        1.5
      );
    });
  });

  describe('capture mode', () => {
    beforeEach(() => setSearch('?capture=1'));

    it('should ignore persisted zoom and stay at 1', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ zoom: 2 }));
      expect(createService().zoom()).toBe(1);
    });

    it('should ignore persisted guides', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ guides: true }));
      expect(createService().guides()).toBe(false);
    });

    it('should ignore persisted rulers', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ rulers: true }));
      expect(createService().rulers()).toBe(false);
    });

    it('should not write canvas state back to storage', () => {
      const service = createService();
      service.setZoom(1.5);
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it('should ignore a persisted viewport width', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ viewportWidth: 480 }));
      expect(createService().viewportWidth()).toBeNull();
    });
  });

  describe('viewport width', () => {
    it('should start unconstrained', () => {
      expect(createService().viewportWidth()).toBeNull();
    });

    it('should restore a persisted width', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ viewportWidth: 480 }));
      expect(createService().viewportWidth()).toBe(480);
    });

    it('should persist a width change', () => {
      const service = createService();
      service.setViewportWidth(640);
      expect(
        JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}').viewportWidth
      ).toBe(640);
    });

    it('should clamp a width outside the legal range', () => {
      const service = createService();
      service.setViewportWidth(10);
      expect(service.viewportWidth()).toBe(240);
    });

    it('should clear the constraint when set to null', () => {
      const service = createService();
      service.setViewportWidth(640);
      service.setViewportWidth(null);
      expect(service.viewportWidth()).toBeNull();
    });

    it('should ignore a persisted width that is not a number', () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ viewportWidth: 'wide' })
      );
      expect(createService().viewportWidth()).toBeNull();
    });
  });

  describe('viewport toggle', () => {
    it('should turn on at the default width', () => {
      const service = createService();
      service.toggleViewport();
      expect(service.viewportWidth()).toBe(390);
    });

    it('should turn off again', () => {
      const service = createService();
      service.toggleViewport();
      service.toggleViewport();
      expect(service.viewportWidth()).toBeNull();
    });

    it('should return to the last width rather than the default', () => {
      const service = createService();
      service.setViewportWidth(768);
      service.toggleViewport();
      service.toggleViewport();
      expect(service.viewportWidth()).toBe(768);
    });
  });
});
