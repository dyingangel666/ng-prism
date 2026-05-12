import { TestBed } from '@angular/core/testing';
import type { RuntimeComponent } from '../../plugin/plugin.types.js';
import type { CanvasBg } from '../../shared/canvas-bg.type.js';
import { PRISM_MANIFEST } from '../tokens/prism-tokens.js';
import { PrismManifestService } from '../services/prism-manifest.service.js';
import { PrismNavigationService } from '../services/prism-navigation.service.js';
import { PrismRendererService } from '../services/prism-renderer.service.js';
import { PrismVariantBgService } from '../services/prism-variant-bg.service.js';
import { PrismCanvasBgPillComponent } from './prism-canvas-bg-pill.component.js';

function makeComponent(bg?: CanvasBg): RuntimeComponent {
  return {
    type: class {} as unknown as RuntimeComponent['type'],
    meta: {
      className: 'TestComp',
      filePath: '',
      showcaseConfig: { title: 'Test', bg },
      inputs: [],
      outputs: [],
      componentMeta: { selector: 'test', standalone: true, isDirective: false },
    },
  };
}

describe('PrismCanvasBgPillComponent', () => {
  let nav: PrismNavigationService;
  let manifestService: PrismManifestService;
  let bgService: PrismVariantBgService;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: PRISM_MANIFEST, useValue: { components: [], pages: [] } },
      ],
    });
    manifestService = TestBed.inject(PrismManifestService);
    nav = TestBed.inject(PrismNavigationService);
    bgService = TestBed.inject(PrismVariantBgService);
    TestBed.inject(PrismRendererService);
  });

  function activate(comp: RuntimeComponent): void {
    manifestService.updateManifest({ components: [comp], pages: [] });
    nav.activeItem.set({ kind: 'component', data: comp });
    TestBed.flushEffects();
  }

  it('is hidden when no recommendation exists', () => {
    activate(makeComponent());
    const fixture = TestBed.createComponent(PrismCanvasBgPillComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.prism-bg-pill')).toBeNull();
  });

  it('is hidden when recommendation exists but no override is set', () => {
    activate(makeComponent('dark'));
    const fixture = TestBed.createComponent(PrismCanvasBgPillComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.prism-bg-pill')).toBeNull();
  });

  it('is visible when recommendation and override differ', () => {
    activate(makeComponent('dark'));
    bgService.setOverride('light');
    const fixture = TestBed.createComponent(PrismCanvasBgPillComponent);
    fixture.detectChanges();

    const pill = fixture.nativeElement.querySelector('.prism-bg-pill');
    expect(pill).not.toBeNull();
    expect(pill.textContent).toContain('Recommended: dark');
  });

  it('reset button clears the override', () => {
    activate(makeComponent('dark'));
    bgService.setOverride('light');
    const fixture = TestBed.createComponent(PrismCanvasBgPillComponent);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button');
    button.click();
    fixture.detectChanges();

    expect(bgService.effective()).toBe('dark');
    expect(fixture.nativeElement.querySelector('.prism-bg-pill')).toBeNull();
  });
});
