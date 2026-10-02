import { quadDistances, quadLines, type QuadSpan, quadSpans } from './measure-quad.js';

const card = { left: 148, top: 64, right: 368, bottom: 260 };

describe('quadDistances', () => {
    it('should report the four insets when the target sits inside the anchor', () => {
        // Button in the card's bottom-right, 16px padding on both sides.
        const button = { left: 258, top: 212, right: 352, bottom: 244 };

        expect(quadDistances(card, button)).toEqual({
            top: 148,
            right: 16,
            bottom: 16,
            left: 110,
            contained: true
        });
    });

    it('should report zero on a side where the edges coincide', () => {
        const flush = { left: 148, top: 64, right: 368, bottom: 100 };

        expect(quadDistances(card, flush)).toEqual({
            top: 0,
            right: 0,
            bottom: 160,
            left: 0,
            contained: true
        });
    });

    it('should report the axis gaps when the boxes are disjoint', () => {
        // Right of and below the card. 32 pixels of horizontal air, 20 vertical.
        const other = { left: 400, top: 280, right: 480, bottom: 320 };
        const result = quadDistances(card, other);

        expect(result.contained).toBe(false);
        expect(result.right).toBe(32);
        expect(result.bottom).toBe(20);
        expect(result.left).toBe(0);
        expect(result.top).toBe(0);
    });

    it('should report a zero gap on an axis where the boxes overlap', () => {
        // Overlaps the card vertically, sits beside it horizontally.
        const beside = { left: 400, top: 100, right: 480, bottom: 200 };
        const result = quadDistances(card, beside);

        expect(result.contained).toBe(false);
        expect(result.right).toBe(32);
        expect(result.top).toBe(0);
        expect(result.bottom).toBe(0);
    });

    it('should treat a partially overlapping target as not contained', () => {
        // Sticks out of the card on the right. The inset reading would be
        // misleading here, because `right` would go negative and look like a distance.
        const overhang = { left: 300, top: 100, right: 420, bottom: 160 };

        // The boxes overlap on both axes, so there is no gap to report on any
        // side: a target that sticks out is not at a distance from the
        // anchor, it is inside it on that axis. All four sides come back 0.
        expect(quadDistances(card, overhang)).toEqual({
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            contained: false
        });
    });
});

describe('quadSpans', () => {
    const anchor = { left: 0, top: 0, right: 200, bottom: 100 };
    const target = { left: 16, top: 16, right: 184, bottom: 84 };

    it('should produce one span per non-zero side', () => {
        expect(quadSpans(anchor, target)).toHaveLength(4);
    });

    it('should run each span between the two edges it measures', () => {
        const top = quadSpans(anchor, target).find((s) => s.side === 'top');

        // Centered above the target, from the anchor edge to the target edge.
        expect(top).toEqual({ a: { x: 100, y: 0 }, b: { x: 100, y: 16 }, value: 16, side: 'top' });
    });

    it('should drop a side whose distance is zero', () => {
        // A measurement line of length 0 is not "0 px" but nothing: two
        // flush edges have no distance that could be drawn.
        const flush = { left: 0, top: 16, right: 200, bottom: 84 };
        const sides = quadSpans(anchor, flush).map((s) => s.side);

        expect(sides).toEqual(['top', 'bottom']);
    });

    it('should produce no spans when the boxes are flush on every side', () => {
        expect(quadSpans(anchor, anchor)).toEqual([]);
    });
});

describe('quadLines', () => {
    const span: QuadSpan = { a: { x: 100, y: 0 }, b: { x: 100, y: 16 }, value: 16, side: 'top' };
    const centre = { x: 100, y: 50 };

    it('should format the value without a unit', () => {
        const [line] = quadLines([span], centre, 1);

        expect(line.text).toBe('16');
    });

    it('should divide the value by zoom, not multiply it', () => {
        // Pinned at a zoom other than 1 so a future slip from `/ zoom` to
        // `* zoom` fails loudly: at zoom 2, that mistake would produce "32",
        // not "8".
        const [line] = quadLines([span], centre, 2);

        expect(line.text).toBe('8');
    });

    it('should mark every hover line unpinned with no snap echoes', () => {
        const [line] = quadLines([span], centre, 1);

        expect(line.pinned).toBe(false);
        expect(line.echoes).toEqual([]);
    });

    it('should derive ticks and the label from the shared geometry helpers', () => {
        // Hand-computed from tickEndpoints/labelPlacement's own documented
        // behaviour, the same way measure-geometry.spec.ts pins its cases,
        // rather than re-calling the helpers here and comparing against
        // themselves.
        const [line] = quadLines([span], centre, 1);

        expect(line.tickA).toEqual([
            { x: 103.5, y: 0 },
            { x: 96.5, y: 0 }
        ]);
        expect(line.tickB).toEqual([
            { x: 103.5, y: 16 },
            { x: 96.5, y: 16 }
        ]);
        expect(line.label).toEqual({ x: 85, y: 8 });
    });
});
