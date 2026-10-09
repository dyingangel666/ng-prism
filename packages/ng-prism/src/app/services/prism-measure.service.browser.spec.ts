import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { MeasurePoint } from '../../shared/measure.type.js';
import { PrismCanvasService } from './prism-canvas.service.js';
import { PrismMeasureService } from './prism-measure.service.js';
import { PrismNavigationService } from './prism-navigation.service.js';
import { PrismRendererService } from './prism-renderer.service.js';

const pt = (x: number, y: number): MeasurePoint => ({ x, y, snap: null });

describe('PrismMeasureService', () => {
    let activeComponent: ReturnType<typeof signal<unknown>>;
    let activeVariantIndex: ReturnType<typeof signal<number>>;
    let measure: ReturnType<typeof signal<boolean>>;
    let service: PrismMeasureService;

    beforeEach(() => {
        activeComponent = signal<unknown>({ id: 'a' });
        activeVariantIndex = signal(0);
        measure = signal(false);

        // Every other TestBed-based spec in this codebase (e.g.
        // prism-persistence.service.spec.ts, prism-variant-bg.service.spec.ts)
        // resets explicitly before configuring: this workspace's Jest setup does
        // not reliably run Angular's automatic post-test teardown between
        // `it` blocks, so without this the second test fails with "test module
        // has already been instantiated".
        TestBed.resetTestingModule();
        TestBed.configureTestingModule({
            providers: [
                { provide: PrismNavigationService, useValue: { activeComponent } },
                { provide: PrismRendererService, useValue: { activeVariantIndex } },
                // Explicitly mocked, not real: the real PrismCanvasService pulls
                // PrismCaptureService, URL parsing and localStorage into a unit
                // test that has no need to know about any of it. Kept as a `let`
                // (not an inline signal() per call) so tests can drive the toggle
                // and exercise the suspend-on-toggle-off effect, not just the
                // method it calls.
                { provide: PrismCanvasService, useValue: { measure } }
            ]
        });
        service = TestBed.inject(PrismMeasureService);
        TestBed.tick();
    });

    it('should start with nothing', () => {
        expect(service.draft()).toBeNull();
        expect(service.pins()).toEqual([]);
    });

    it('should carry a draft from begin to update', () => {
        service.beginDraft(pt(10, 10));
        service.updateDraft(pt(10, 34));

        expect(service.draft()).toEqual({ a: pt(10, 10), b: pt(10, 34) });
    });

    it('should move a committed draft into the pins', () => {
        service.beginDraft(pt(0, 0));
        service.updateDraft(pt(3, 4));
        service.commitDraft();

        expect(service.pins()).toHaveLength(1);
        expect(service.draft()).toBeNull();
    });

    it('should ignore a commit with no draft', () => {
        service.commitDraft();

        expect(service.pins()).toEqual([]);
    });

    it('should drop the draft on cancel without touching the pins', () => {
        service.beginDraft(pt(0, 0));
        service.updateDraft(pt(3, 4));
        service.commitDraft();
        service.beginDraft(pt(9, 9));
        service.cancelDraft();

        expect(service.draft()).toBeNull();
        expect(service.pins()).toHaveLength(1);
    });

    it('should remove a pin by index', () => {
        service.beginDraft(pt(0, 0));
        service.updateDraft(pt(1, 0));
        service.commitDraft();
        service.removePin(0);

        expect(service.pins()).toEqual([]);
    });

    it('should discard everything when the active variant changes', () => {
        // Review Focus 3. The same rule by which PrismVariantBgService lets its
        // override lapse: pins reference element geometry that does not survive
        // the switch, and numbers without a referent are worse than no numbers.
        service.beginDraft(pt(0, 0));
        service.updateDraft(pt(1, 0));
        service.commitDraft();
        service.beginDraft(pt(5, 5));

        activeVariantIndex.set(1);
        TestBed.tick();

        expect(service.draft()).toBeNull();
        expect(service.pins()).toEqual([]);
    });

    it('should discard everything when the active component changes', () => {
        service.beginDraft(pt(0, 0));
        service.updateDraft(pt(1, 0));
        service.commitDraft();

        activeComponent.set({ id: 'b' });
        TestBed.tick();

        expect(service.pins()).toEqual([]);
    });

    it('should clear the hover anchor along with the rest', () => {
        service.setHoverAnchor(document.createElement('div'));
        activeVariantIndex.set(2);
        TestBed.tick();

        expect(service.hoverAnchor()).toBeNull();
    });

    it('should drop the draft but keep the pins when the tool is switched off', () => {
        // Spec §9. The toggle is a mode, not a reset: an accidental click on the
        // rail must not cost the whole measurement work. The running measurement,
        // on the other hand, has no meaning without a pointer anymore, and neither
        // does the hover anchor: once the overlay that renders it is gone, the
        // anchored element has nothing left to refer to, so it leaves with the
        // draft rather than surviving with the pins.
        //
        // This exercises the contract of suspend() directly. The sibling test
        // below exercises the effect that calls suspend() when the canvas
        // toggle goes false — the two are not redundant: this one would still
        // pass if that effect were deleted.
        service.beginDraft(pt(0, 0));
        service.updateDraft(pt(1, 0));
        service.commitDraft();
        service.beginDraft(pt(5, 5));
        service.setHoverAnchor(document.createElement('div'));

        service.suspend();

        expect(service.draft()).toBeNull();
        expect(service.hoverAnchor()).toBeNull();
        expect(service.pins()).toHaveLength(1);
    });

    it('should drop the draft but keep the pins when the toggle is switched off', () => {
        // Drives the canvas.measure() toggle itself, not suspend() directly —
        // this is the test that would fail if the constructor's second effect
        // were ever deleted, which the test above (calling suspend() directly)
        // cannot catch.
        service.beginDraft(pt(0, 0));
        service.updateDraft(pt(1, 0));
        service.commitDraft();
        service.beginDraft(pt(5, 5));
        service.setHoverAnchor(document.createElement('div'));

        measure.set(true);
        TestBed.tick();
        measure.set(false);
        TestBed.tick();

        expect(service.draft()).toBeNull();
        expect(service.hoverAnchor()).toBeNull();
        expect(service.pins()).toHaveLength(1);
    });
});
