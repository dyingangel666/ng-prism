import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { signal, ɵresolveComponentResources as resolveComponentResources } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { MeasurePoint } from '../../shared/measure.type.js';
import { PrismCanvasService } from '../services/prism-canvas.service.js';
import { PrismMeasureService } from '../services/prism-measure.service.js';
import { PrismNavigationService } from '../services/prism-navigation.service.js';
import { PrismRendererService } from '../services/prism-renderer.service.js';
import { echoFor, elementUnderPoint, PrismCanvasMeasureComponent, watchGeometry } from './prism-canvas-measure.component.js';

// jsdom does not implement `elementsFromPoint` at all — not even a stub that
// returns an empty list — so `jest.spyOn` below would have no existing
// property to attach to. A no-op default gives it one; every test that cares
// still overrides the hit list it wants. File scope rather than inside the
// first describe, because the pointer tests further down reach
// `elementUnderPoint` through the component and would otherwise depend on
// describe execution order for the property to exist.
beforeAll(() => {
    if (typeof document.elementsFromPoint !== 'function') {
        document.elementsFromPoint = (): Element[] => [];
    }
});

describe('elementUnderPoint', () => {
    let root: HTMLElement;
    let child: HTMLElement;
    let deeper: HTMLElement;
    let overlay: HTMLElement;
    let outside: HTMLElement;

    beforeEach(() => {
        root = document.createElement('div');
        child = document.createElement('span');
        deeper = document.createElement('em');
        overlay = document.createElement('prism-canvas-measure');
        outside = document.createElement('div');
        child.appendChild(deeper);
        root.appendChild(child);
        document.body.append(root, overlay, outside);
    });

    afterEach(() => {
        root.remove();
        overlay.remove();
        outside.remove();
        jest.restoreAllMocks();
    });

    /** `document.elementsFromPoint` answering a fixed hit list, topmost first. */
    const hits = (...elements: Element[]): void => {
        jest.spyOn(document, 'elementsFromPoint').mockReturnValue(elements);
    };

    it('should return an element inside the rendered root', () => {
        hits(child);

        expect(elementUnderPoint(10, 10, root)).toBe(child);
    });

    it('should look past the overlay itself to the specimen behind it', () => {
        // The case the whole plural-`elementsFromPoint` rewrite exists for.
        // The overlay host now carries a z-index that puts it above
        // `.demo-wrap`, and it is the layer that takes the pointer — so it is
        // the topmost hit for every point over the specimen. The singular
        // `elementFromPoint` would answer the overlay, `contains` would reject
        // it, and snapping and alt-click anchoring would both stop working
        // outright.
        hits(overlay, child, root);

        expect(elementUnderPoint(10, 10, root)).toBe(child);
    });

    it('should reject an element outside the rendered root', () => {
        // Review focus 4: without this check the tool latches onto its own
        // overlay or the toolrail instead of the specimen.
        // plugin-box-model protects itself with exactly this contains() check.
        hits(outside);

        expect(elementUnderPoint(10, 10, root)).toBeNull();
    });

    it('should still reject chrome when nothing of the specimen is under the point', () => {
        // The toolrail and the grips sit above the overlay, so they lead the
        // hit list where they are. Walking the list must not turn into
        // "return whatever is at the bottom of it".
        hits(overlay, outside, document.body);

        expect(elementUnderPoint(10, 10, root)).toBeNull();
    });

    it('should return the topmost hit the root owns, not the deepest', () => {
        // `elementsFromPoint` answers topmost first, and the first owned hit
        // is exactly what the singular call used to give. Taking the last one
        // instead would snap to a container when the pointer is over its
        // child.
        hits(overlay, deeper, child, root);

        expect(elementUnderPoint(10, 10, root)).toBe(deeper);
    });

    it('should return null when nothing is under the point', () => {
        hits();

        expect(elementUnderPoint(10, 10, root)).toBeNull();
    });

    it('should return null without a rendered root', () => {
        expect(elementUnderPoint(10, 10, null)).toBeNull();
    });
});

describe('echoFor', () => {
    const at = { x: 100, y: 50 };

    it('should draw a horizontal echo for a horizontal edge', () => {
        const point = { x: 0, y: 0, snap: { kind: 'padding' as const, side: 'top' as const, from: document.createElement('div') } };

        expect(echoFor(point, at)).toEqual([
            { x: 86, y: 50 },
            { x: 114, y: 50 }
        ]);
    });

    it('should draw a vertical echo for a vertical edge', () => {
        const point = { x: 0, y: 0, snap: { kind: 'border' as const, side: 'left' as const, from: document.createElement('div') } };

        expect(echoFor(point, at)).toEqual([
            { x: 100, y: 36 },
            { x: 100, y: 64 }
        ]);
    });

    it('should draw nothing for a free point', () => {
        // A free point has no edge it sits on — an echo there would claim a
        // snap that never happened.
        expect(echoFor({ x: 0, y: 0, snap: null }, at)).toBeNull();
    });
});

describe('watchGeometry', () => {
    // jsdom does not implement ResizeObserver at all. watchGeometry takes the
    // constructor as a parameter for exactly this reason, so the fake below
    // is passed explicitly rather than patched onto the global — there is
    // nothing here that depends on a real one existing.
    class FakeResizeObserver {
        static instances: FakeResizeObserver[] = [];
        readonly observed: Element[] = [];
        disconnected = false;

        // The callback is accepted and dropped: the fake never fires, and
        // every test that needs `onChange` called drives it through the
        // `scroll` listener instead. Stored it was dead state, which
        // `tsc --build` rejects outright (TS6138) and which failed
        // `nx run ng-prism:typecheck` on this branch before the parameter
        // was renamed out of the way.
        constructor(_callback: ResizeObserverCallback) {
            FakeResizeObserver.instances.push(this);
        }

        observe(target: Element): void {
            this.observed.push(target);
        }

        unobserve(): void {}

        disconnect(): void {
            this.disconnected = true;
        }
    }

    let stage: HTMLElement;
    let wrap: HTMLElement;

    beforeEach(() => {
        FakeResizeObserver.instances = [];
        stage = document.createElement('div');
        wrap = document.createElement('div');
        stage.appendChild(wrap);
        document.body.appendChild(stage);
    });

    afterEach(() => {
        stage.remove();
    });

    it('should observe the stage and .demo-wrap', () => {
        watchGeometry(stage, wrap, () => {}, FakeResizeObserver as unknown as typeof ResizeObserver);

        expect(FakeResizeObserver.instances[0]?.observed).toEqual([stage, wrap]);
    });

    it('should observe only the stage when there is no .demo-wrap', () => {
        watchGeometry(stage, null, () => {}, FakeResizeObserver as unknown as typeof ResizeObserver);

        expect(FakeResizeObserver.instances[0]?.observed).toEqual([stage]);
    });

    it('should call onChange on scroll', () => {
        // A ResizeObserver does not fire on scroll — this is the trigger
        // that would be silently missing if it were left out as supposedly
        // redundant with the observer.
        const onChange = jest.fn();

        watchGeometry(stage, wrap, onChange, FakeResizeObserver as unknown as typeof ResizeObserver);
        stage.dispatchEvent(new Event('scroll'));

        expect(onChange).toHaveBeenCalledTimes(1);
    });

    it('should disconnect the observer and remove the scroll listener on teardown', () => {
        const onChange = jest.fn();
        const teardown = watchGeometry(stage, wrap, onChange, FakeResizeObserver as unknown as typeof ResizeObserver);

        teardown();
        stage.dispatchEvent(new Event('scroll'));

        expect(FakeResizeObserver.instances[0]?.disconnected).toBe(true);
        expect(onChange).not.toHaveBeenCalled();
    });
});

const pt = (x: number, y: number): MeasurePoint => ({ x, y, snap: null });

describe('PrismCanvasMeasureComponent — keyboard', () => {
    let measure: PrismMeasureService;

    /**
     * Load `templateUrl`/`styleUrl` off disk before TestBed sees the class —
     * the same JIT-resource bootstrap `prism-canvas-bg-pill.component.spec.ts`
     * uses for the same reason: these specs are transpiled by SWC rather than
     * compiled by `ngtsc`, so nothing resolves the component's external
     * template/style ahead of time the way a real build would. This component
     * has no child custom component of its own (unlike
     * `prism-canvas-pin-row.component.ts`'s `PrismIconComponent`), so the
     * single-`__dirname` resolver here is enough — no recursive search for a
     * resource under a different directory, and no signal-input JIT
     * limitation to double around.
     */
    beforeAll(async () => {
        await resolveComponentResources((url) => readFile(join(__dirname, url), 'utf8'));
    });

    beforeEach(() => {
        TestBed.resetTestingModule();
        TestBed.configureTestingModule({
            providers: [
                { provide: PrismNavigationService, useValue: { activeComponent: signal(null) } },
                { provide: PrismRendererService, useValue: { activeVariantIndex: signal(0), renderedElement: signal(null) } },
                { provide: PrismCanvasService, useValue: { measure: signal(false), zoom: signal(1) } }
            ]
        });
        measure = TestBed.inject(PrismMeasureService);
        // Flushes the constructor's effects (see prism-measure.service.ts) so
        // their first, unconditional run lands here rather than inside a test
        // body, where it would otherwise race the fixture's own
        // `detectChanges()` and clear a draft the test just began — the same
        // reason `prism-canvas-pin-row.component.browser.spec.ts` ticks here.
        TestBed.tick();
    });

    /** Dispatches a real `keydown` on the host and returns it for inspection. */
    function keydown(host: Element, key: string, shiftKey = false): KeyboardEvent {
        const event = new KeyboardEvent('keydown', { key, shiftKey, bubbles: true, cancelable: true });

        host.dispatchEvent(event);
        return event;
    }

    it('should move the active draft point by one pixel on an arrow key', () => {
        measure.beginDraft(pt(10, 10));
        const fixture = TestBed.createComponent(PrismCanvasMeasureComponent);

        fixture.detectChanges();
        keydown(fixture.nativeElement, 'ArrowRight');

        expect(measure.draft()).toEqual({ a: pt(10, 10), b: pt(11, 10) });
    });

    it('should move by the coarse step with Shift held', () => {
        measure.beginDraft(pt(10, 10));
        const fixture = TestBed.createComponent(PrismCanvasMeasureComponent);

        fixture.detectChanges();
        keydown(fixture.nativeElement, 'ArrowRight', true);

        expect(measure.draft()?.b).toEqual(pt(20, 10));
    });

    it('should commit the draft on Enter', () => {
        measure.beginDraft(pt(0, 0));
        measure.updateDraft(pt(0, 24));
        const fixture = TestBed.createComponent(PrismCanvasMeasureComponent);

        fixture.detectChanges();
        keydown(fixture.nativeElement, 'Enter');

        expect(measure.draft()).toBeNull();
        expect(measure.pins()).toEqual([{ a: pt(0, 0), b: pt(0, 24) }]);
    });

    it('should cancel the draft on Escape, leaving existing pins untouched', () => {
        measure.beginDraft(pt(0, 0));
        measure.updateDraft(pt(0, 24));
        measure.commitDraft();
        measure.beginDraft(pt(5, 5));
        const fixture = TestBed.createComponent(PrismCanvasMeasureComponent);

        fixture.detectChanges();
        keydown(fixture.nativeElement, 'Escape');

        expect(measure.draft()).toBeNull();
        expect(measure.pins()).toEqual([{ a: pt(0, 0), b: pt(0, 24) }]);
    });

    it('should not call preventDefault for a key it does not own, so Tab stays usable for native focus navigation', () => {
        // The case that matters most: `nudge()` returns `null` instead of the
        // unchanged point for exactly this reason — see its doc. A tool that
        // swallowed Tab here would trap keyboard focus on the whole canvas.
        measure.beginDraft(pt(10, 10));
        const fixture = TestBed.createComponent(PrismCanvasMeasureComponent);

        fixture.detectChanges();
        const event = keydown(fixture.nativeElement, 'Tab');

        expect(event.defaultPrevented).toBe(false);
    });
});
