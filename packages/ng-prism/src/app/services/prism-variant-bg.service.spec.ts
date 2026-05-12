import { TestBed } from '@angular/core/testing';
import type { RuntimeComponent } from '../../plugin/plugin.types.js';
import type { CanvasBg } from '../../shared/canvas-bg.type.js';
import { PRISM_MANIFEST } from '../tokens/prism-tokens.js';
import { PrismCanvasService } from './prism-canvas.service.js';
import { PrismManifestService } from './prism-manifest.service.js';
import { PrismNavigationService } from './prism-navigation.service.js';
import { PrismRendererService } from './prism-renderer.service.js';
import { PrismVariantBgService } from './prism-variant-bg.service.js';

function makeComponent(
  bg?: CanvasBg,
  variants?: { name: string; bg?: CanvasBg }[]
): RuntimeComponent {
  return {
    type: class {} as unknown as RuntimeComponent['type'],
    meta: {
      className: 'TestComp',
      filePath: '',
      showcaseConfig: { title: 'Test', bg, variants },
      inputs: [],
      outputs: [],
      componentMeta: { selector: 'test', standalone: true, isDirective: false },
    },
  };
}

function activate(
  manifestService: PrismManifestService,
  nav: PrismNavigationService,
  comp: RuntimeComponent
): void {
  manifestService.updateManifest({ components: [comp], pages: [] });
  nav.activeItem.set({ kind: 'component', data: comp });
}

describe('PrismVariantBgService', () => {
  let canvas: PrismCanvasService;
  let nav: PrismNavigationService;
  let renderer: PrismRendererService;
  let manifestService: PrismManifestService;
  let service: PrismVariantBgService;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: PRISM_MANIFEST, useValue: { components: [], pages: [] } },
      ],
    });
    canvas = TestBed.inject(PrismCanvasService);
    nav = TestBed.inject(PrismNavigationService);
    renderer = TestBed.inject(PrismRendererService);
    manifestService = TestBed.inject(PrismManifestService);
    canvas.setBg('dots');
    service = TestBed.inject(PrismVariantBgService);
  });

  it('returns null recommended when no bg is declared', () => {
    activate(manifestService, nav, makeComponent());
    TestBed.flushEffects();
    expect(service.recommended()).toBeNull();
    expect(service.effective()).toBe('dots');
  });

  it('returns component-level bg when no variant overrides', () => {
    activate(manifestService, nav, makeComponent('dark'));
    TestBed.flushEffects();
    expect(service.recommended()).toBe('dark');
    expect(service.effective()).toBe('dark');
  });

  it('returns variant-level bg, overriding component-level', () => {
    activate(
      manifestService,
      nav,
      makeComponent('dark', [{ name: 'Light variant', bg: 'light' }])
    );
    renderer.activeVariantIndex.set(0);
    TestBed.flushEffects();
    expect(service.recommended()).toBe('light');
    expect(service.effective()).toBe('light');
  });

  it('respects override and leaves canvas.bg() untouched', () => {
    activate(manifestService, nav, makeComponent('dark'));
    TestBed.flushEffects();
    service.setOverride('plain');
    expect(service.effective()).toBe('plain');
    expect(canvas.bg()).toBe('dots');
  });

  it('clears override on variant switch', () => {
    const comp = makeComponent(undefined, [
      { name: 'A', bg: 'dark' },
      { name: 'B', bg: 'light' },
    ]);
    activate(manifestService, nav, comp);
    renderer.activeVariantIndex.set(0);
    TestBed.flushEffects();
    service.setOverride('plain');
    expect(service.effective()).toBe('plain');

    renderer.activeVariantIndex.set(1);
    TestBed.flushEffects();
    expect(service.effective()).toBe('light');
  });

  it('clears override on component switch', () => {
    activate(manifestService, nav, makeComponent('dark'));
    TestBed.flushEffects();
    service.setOverride('plain');

    activate(manifestService, nav, makeComponent('light'));
    TestBed.flushEffects();
    expect(service.effective()).toBe('light');
  });

  it('clearOverride() resets override to null', () => {
    activate(manifestService, nav, makeComponent('dark'));
    TestBed.flushEffects();
    service.setOverride('plain');
    service.clearOverride();
    expect(service.effective()).toBe('dark');
  });

  it('isDeviating is true only when override differs from recommended', () => {
    activate(manifestService, nav, makeComponent('dark'));
    TestBed.flushEffects();

    expect(service.isDeviating()).toBe(false);

    service.setOverride('dark');
    expect(service.isDeviating()).toBe(false);

    service.setOverride('light');
    expect(service.isDeviating()).toBe(true);

    service.clearOverride();
    expect(service.isDeviating()).toBe(false);
  });
});
