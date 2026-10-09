import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { signal, ɵresolveComponentResources as resolveComponentResources } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
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

describe('PrismCanvasMeasureComponent — pointer', () => {
    let measure: PrismMeasureService;
    let host: HTMLElement;

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
        TestBed.tick();

        const fixture = TestBed.createComponent(PrismCanvasMeasureComponent);

        fixture.detectChanges();
        host = fixture.nativeElement as HTMLElement;
        // jsdom implements neither `PointerEvent` nor `setPointerCapture`.
        // The events below are therefore plain `MouseEvent`s dispatched under
        // the pointer event names — the listeners are registered by name and
        // read nothing a MouseEvent lacks except `pointerId`, which only ever
        // reaches this stub.
        host.setPointerCapture = (): void => {};
    });

    /** Dispatches a pointer-named event on the host and returns it. */
    function pointer(type: string, init: MouseEventInit = {}): MouseEvent {
        const event = new MouseEvent(type, { bubbles: true, cancelable: true, button: 0, ...init });

        host.dispatchEvent(event);
        return event;
    }

    it('should discard a press that never moved rather than pinning 0 px', () => {
        // `beginDraft` seeds b with a, so a click commits a zero-length
        // measurement — a `0 px` chip in the pin row that has to be dismissed
        // by hand. A finished drag being a pin is the design; a click is not a
        // drag.
        pointer('pointerdown', { clientX: 40, clientY: 40 });
        pointer('pointerup', { clientX: 40, clientY: 40 });

        expect(measure.pins()).toEqual([]);
        expect(measure.draft()).toBeNull();
    });

    it('should pin a drag that actually moved', () => {
        // The other half of the same rule: the discard must key on the
        // endpoints coinciding, not on anything that would also swallow a real
        // measurement.
        pointer('pointerdown', { clientX: 40, clientY: 40 });
        pointer('pointermove', { clientX: 96, clientY: 40 });
        pointer('pointerup', { clientX: 96, clientY: 40 });

        expect(measure.pins()).toHaveLength(1);
        expect(measure.draft()).toBeNull();
    });

    it('should ignore a secondary button, so a right-click cannot arm a drag', () => {
        // prism-resizer.directive.ts carries the same guard and spells out
        // why: the context menu takes the pointer, the matching pointerup
        // never arrives, and the draft stays open with no button held — from
        // there `move`'s draft check protects nothing and the measurement
        // follows the cursor.
        pointer('pointerdown', { clientX: 40, clientY: 40, button: 2 });

        expect(measure.draft()).toBeNull();

        pointer('pointermove', { clientX: 96, clientY: 40 });

        expect(measure.draft()).toBeNull();
        expect(measure.pins()).toEqual([]);
    });

    it('should prevent the default press so the drag does not select the specimen', () => {
        const event = pointer('pointerdown', { clientX: 40, clientY: 40 });

        expect(event.defaultPrevented).toBe(true);
    });

    it('should focus the host, which the prevented default would otherwise cost', () => {
        // preventDefault on pointerdown suppresses the compatibility
        // mousedown, and with it the focus the click would have given the
        // host. Without the explicit focus the Enter/Escape/arrow handling is
        // unreachable for anyone who started the measurement with a pointer —
        // which is everyone, since there is no other way to start one.
        pointer('pointerdown', { clientX: 40, clientY: 40 });

        expect(document.activeElement).toBe(host);
    });

    it('should drop the draft on pointercancel', () => {
        // A cancelled pointer otherwise leaves the draft open for ever: the
        // same end state the missing button guard produced, reached another
        // way.
        pointer('pointerdown', { clientX: 40, clientY: 40 });
        pointer('pointermove', { clientX: 96, clientY: 40 });
        pointer('pointercancel', { clientX: 96, clientY: 40 });

        expect(measure.draft()).toBeNull();
        expect(measure.pins()).toEqual([]);
    });
});

describe('PrismCanvasMeasureComponent — alt-hover readout', () => {
    let measure: PrismMeasureService;
    let fixture: ComponentFixture<PrismCanvasMeasureComponent>;
    let host: HTMLElement;
    let root: HTMLElement;
    let anchor: HTMLElement;
    let target: HTMLElement;

    beforeAll(async () => {
        await resolveComponentResources((url) => readFile(join(__dirname, url), 'utf8'));
    });

    /**
     * A fixed rect for one element.
     *
     * jsdom has no layout engine and answers every `getBoundingClientRect()`
     * with zeros, so the four-sided readout would have nothing to compute
     * from. Stubbing the two boxes is what makes the *arithmetic and the
     * rendering* testable here; where each outline lands on screen is not,
     * and cannot be — that half needs a browser.
     */
    function stubRect(element: Element, left: number, top: number, right: number, bottom: number): void {
        element.getBoundingClientRect = (): DOMRect => ({ left, top, right, bottom, width: right - left, height: bottom - top, x: left, y: top }) as unknown as DOMRect;
    }

    beforeEach(() => {
        root = document.createElement('div');
        anchor = document.createElement('div');
        target = document.createElement('div');
        root.append(anchor, target);
        document.body.appendChild(root);
        // A 200x200 anchor with the target inset 16px on every side — the
        // "target inside anchor" reading from Spec §4.5, the one that makes a
        // container's padding visible on all four sides at once.
        stubRect(anchor, 100, 100, 300, 300);
        stubRect(target, 116, 116, 284, 284);

        TestBed.resetTestingModule();
        TestBed.configureTestingModule({
            providers: [
                { provide: PrismNavigationService, useValue: { activeComponent: signal(null) } },
                { provide: PrismRendererService, useValue: { activeVariantIndex: signal(0), renderedElement: signal(root) } },
                { provide: PrismCanvasService, useValue: { measure: signal(false), zoom: signal(1) } }
            ]
        });
        measure = TestBed.inject(PrismMeasureService);
        TestBed.tick();

        fixture = TestBed.createComponent(PrismCanvasMeasureComponent);
        fixture.detectChanges();
        host = fixture.nativeElement as HTMLElement;
        host.setPointerCapture = (): void => {};
    });

    afterEach(() => {
        root.remove();
        jest.restoreAllMocks();
    });

    /**
     * Dispatches a pointer-named event on the host and re-renders.
     *
     * The handlers are wired in the constructor rather than through the
     * template, so nothing marks the component dirty on its own — the
     * explicit `detectChanges` is what puts the computed's result into the
     * DOM the assertions read.
     */
    function pointer(type: string, init: MouseEventInit = {}): void {
        host.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, button: 0, ...init }));
        fixture.detectChanges();
    }

    /** `document.elementsFromPoint` answering a fixed hit list. */
    const hits = (...elements: Element[]): void => {
        jest.spyOn(document, 'elementsFromPoint').mockReturnValue(elements);
    };

    it('should outline the anchor as soon as it is alt-clicked, before anything is hovered', () => {
        // Spec §4.5, and the reason it matters beyond conformance: without
        // this, an Alt-click produces no visible change at all. Nothing is
        // drawn until a *second* element is hovered, and hovering the anchor
        // itself deliberately draws no spans either — so there was no way to
        // tell whether the anchor had registered.
        hits(anchor);
        pointer('pointerdown', { clientX: 150, clientY: 150, altKey: true });

        expect(measure.hoverAnchor()).toBe(anchor);
        expect(host.querySelectorAll('.m-outline--anchor')).toHaveLength(1);
        expect(host.querySelectorAll('.m-outline--target')).toHaveLength(0);
    });

    it('should outline both boxes and draw the four spans once a target is hovered', () => {
        hits(anchor);
        pointer('pointerdown', { clientX: 150, clientY: 150, altKey: true });
        hits(target);
        pointer('pointermove', { clientX: 200, clientY: 200, altKey: true });

        expect(host.querySelectorAll('.m-outline--anchor')).toHaveLength(1);
        expect(host.querySelectorAll('.m-outline--target')).toHaveLength(1);
        expect(host.querySelectorAll('.m-label')).toHaveLength(4);
    });

    it('should draw the same four spans when the inner box is alt-clicked first', () => {
        // The reverse of the test above: `target` (the inner box) becomes the
        // anchor and `anchor` (its container) is hovered. This used to draw
        // both outlines and no numbers at all, because only the hovered-inside-
        // anchor order counted as containment.
        hits(target);
        pointer('pointerdown', { clientX: 200, clientY: 200, altKey: true });
        hits(anchor);
        pointer('pointermove', { clientX: 150, clientY: 150, altKey: true });

        expect(host.querySelectorAll('.m-label')).toHaveLength(4);
        expect(host.querySelector('.m-live')?.textContent?.trim()).toBe('top 16 px, right 16 px, bottom 16 px, left 16 px');
    });

    it('should drop the target outline when the pointer returns to the anchor', () => {
        // There is no distance from an element to itself, so no spans — but
        // the anchor is still set, so its own outline stays.
        hits(anchor);
        pointer('pointerdown', { clientX: 150, clientY: 150, altKey: true });
        hits(anchor);
        pointer('pointermove', { clientX: 150, clientY: 150, altKey: true });

        expect(host.querySelectorAll('.m-outline--anchor')).toHaveLength(1);
        expect(host.querySelectorAll('.m-outline--target')).toHaveLength(0);
        expect(host.querySelectorAll('.m-label')).toHaveLength(0);
    });

    it('should announce the four-sided readout in the live region', () => {
        // The live region only ever read the drag measurement, so the headline
        // alt-hover feature was announced to nobody. The drawn form drops the
        // unit and lets position say which side each number belongs to;
        // neither survives being read aloud.
        hits(anchor);
        pointer('pointerdown', { clientX: 150, clientY: 150, altKey: true });
        hits(target);
        pointer('pointermove', { clientX: 200, clientY: 200, altKey: true });

        expect(host.querySelector('.m-live')?.textContent?.trim()).toBe('top 16 px, right 16 px, bottom 16 px, left 16 px');
    });
});
