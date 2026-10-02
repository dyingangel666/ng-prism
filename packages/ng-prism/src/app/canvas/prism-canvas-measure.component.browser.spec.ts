import { echoFor, elementUnderPoint, watchGeometry } from './prism-canvas-measure.component.js';

describe('elementUnderPoint', () => {
    let root: HTMLElement;
    let child: HTMLElement;
    let outside: HTMLElement;

    beforeAll(() => {
        // jsdom does not implement `elementFromPoint` at all — not even a
        // stub that returns null — so `jest.spyOn` below has no existing
        // property to attach to without this. A no-op default gives it one;
        // every test still overrides the return value it cares about.
        if (typeof document.elementFromPoint !== 'function') {
            document.elementFromPoint = (): Element | null => null;
        }
    });

    beforeEach(() => {
        root = document.createElement('div');
        child = document.createElement('span');
        outside = document.createElement('div');
        root.appendChild(child);
        document.body.append(root, outside);
    });

    afterEach(() => {
        root.remove();
        outside.remove();
        jest.restoreAllMocks();
    });

    it('should return an element inside the rendered root', () => {
        jest.spyOn(document, 'elementFromPoint').mockReturnValue(child);

        expect(elementUnderPoint(10, 10, root)).toBe(child);
    });

    it('should reject an element outside the rendered root', () => {
        // Review focus 4: without this check the tool latches onto its own
        // overlay or the toolrail instead of the specimen.
        // plugin-box-model protects itself with exactly this contains() check.
        jest.spyOn(document, 'elementFromPoint').mockReturnValue(outside);

        expect(elementUnderPoint(10, 10, root)).toBeNull();
    });

    it('should return null when nothing is under the point', () => {
        jest.spyOn(document, 'elementFromPoint').mockReturnValue(null);

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

        constructor(private readonly callback: ResizeObserverCallback) {
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
