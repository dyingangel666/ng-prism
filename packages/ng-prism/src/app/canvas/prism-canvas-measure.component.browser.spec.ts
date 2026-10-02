import { echoFor, elementUnderPoint } from './prism-canvas-measure.component.js';

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
