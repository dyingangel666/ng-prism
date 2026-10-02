import { quadDistances } from './measure-quad.js';

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

        expect(quadDistances(card, overhang).contained).toBe(false);
    });
});
