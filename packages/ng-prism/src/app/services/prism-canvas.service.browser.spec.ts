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
  });
});
