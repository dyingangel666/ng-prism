import { MEASURE_SNAP_TOLERANCE } from '../../shared/measure.type.js';
import { type ElementBox, nearestSnap, snapTargetsFor } from './measure-snap.js';

const box: ElementBox = {
    rect: { left: 100, top: 50, right: 300, bottom: 150 },
    border: { top: 2, right: 2, bottom: 2, left: 2 },
    padding: { top: 16, right: 16, bottom: 16, left: 16 }
};

describe('snapTargetsFor', () => {
    it('should produce twelve targets: four sides times three boxes', () => {
        expect(snapTargetsFor(box)).toHaveLength(12);
    });

    it('should place the border-box edges on the element rect', () => {
        const targets = snapTargetsFor(box);
        const left = targets.find((t) => t.kind === 'border' && t.side === 'left');

        expect(left).toEqual({ kind: 'border', side: 'left', axis: 'x', at: 100 });
    });

    it('should inset the padding box by the border width', () => {
        const targets = snapTargetsFor(box);
        const top = targets.find((t) => t.kind === 'padding' && t.side === 'top');

        expect(top?.at).toBe(52);
    });

    it('should inset the content box by border plus padding', () => {
        const targets = snapTargetsFor(box);
        const right = targets.find((t) => t.kind === 'content' && t.side === 'right');

        expect(right?.at).toBe(300 - 2 - 16);
    });
});

describe('nearestSnap', () => {
    const targets = snapTargetsFor(box);

    it('should latch onto an edge inside the tolerance', () => {
        // Border-left sits at 100 (distance 4), padding-left at 102 (distance
        // 2) — both inside tolerance, padding nearer. See the dedicated
        // "prefer the nearer" test below for the tie-breaking logic itself.
        const hit = nearestSnap({ x: 104, y: 90 }, targets);

        expect(hit).toEqual({ kind: 'padding', side: 'left', axis: 'x', at: 102 });
    });

    it('should return null when nothing is in reach', () => {
        // Free points remain possible — that is half the reason the drag
        // gesture exists: not everything worth measuring has an element edge.
        expect(nearestSnap({ x: 200, y: 100 }, targets)).toBeNull();
    });

    it('should prefer the nearer of two edges in reach', () => {
        // Border-left sits at 100, padding-left at 102.
        expect(nearestSnap({ x: 101.6, y: 90 }, targets)?.kind).toBe('padding');
        expect(nearestSnap({ x: 100.4, y: 90 }, targets)?.kind).toBe('border');
    });

    it('should latch exactly at the tolerance boundary', () => {
        const hit = nearestSnap({ x: 100 + MEASURE_SNAP_TOLERANCE, y: 90 }, targets);

        expect(hit).not.toBeNull();
    });

    it('should not latch just outside the tolerance', () => {
        // On the x axis the edges sit at 100, 102 and 118 — the widest gap is
        // 16, exactly 2x the tolerance, so there is no point "just outside"
        // anything there. On the y axis there is real room between
        // content-top (68) and content-bottom (132): y = 77 sits 9 pixels
        // from the nearest edge, and x = 200 is far from every x edge.
        expect(nearestSnap({ x: 200, y: 77 }, targets)).toBeNull();
    });

    it('should respect a caller-supplied tolerance', () => {
        expect(nearestSnap({ x: 104, y: 90 }, targets, 0)).toBeNull();
    });

    it('should be a no-op against an empty target list', () => {
        expect(nearestSnap({ x: 100, y: 50 }, [])).toBeNull();
    });
});
