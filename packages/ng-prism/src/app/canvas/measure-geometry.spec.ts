import { MEASURE_LABEL_MIN_SPAN } from '../../shared/measure.type.js';
import { formatMeasure, labelPlacement, measureDistance, tickEndpoints, toLocal, toScreen } from './measure-geometry.js';

describe('formatMeasure', () => {
    it('should drop the decimal on a whole value', () => {
        expect(formatMeasure(24)).toBe('24');
    });

    it('should keep one decimal on a fractional value', () => {
        // The entire reason for the one decimal place: 23.5 must not look
        // like 24, or the tool would report a distance as round when it is
        // not.
        expect(formatMeasure(23.5)).toBe('23.5');
    });

    it('should round to one decimal', () => {
        expect(formatMeasure(23.47)).toBe('23.5');
        expect(formatMeasure(23.44)).toBe('23.4');
    });

    it('should collapse a value that rounds to a whole number', () => {
        // Subpixel arithmetic constantly produces values like 23.999999;
        // "24" is the honest output, "24.0" would just be noise.
        expect(formatMeasure(23.999999)).toBe('24');
    });

    it('should format zero', () => {
        expect(formatMeasure(0)).toBe('0');
    });

    it('should format a negative value', () => {
        // Overlapping boxes produce negative distances; the sign is the
        // information.
        expect(formatMeasure(-4.5)).toBe('-4.5');
    });
});

describe('toLocal / toScreen', () => {
    const origin = { x: 100, y: 50 };

    it('should strip the origin at zoom 1', () => {
        expect(toLocal({ x: 160, y: 90 }, origin, 1)).toEqual({ x: 60, y: 40 });
    });

    it('should divide out the zoom, so the result is CSS pixels', () => {
        // This is the core of the coordinate model: at double zoom, 120
        // screen pixels are 60 CSS pixels, and that is exactly what the
        // readout wants.
        expect(toLocal({ x: 220, y: 50 }, origin, 2)).toEqual({ x: 60, y: 0 });
    });

    it('should round-trip through toScreen', () => {
        const local = toLocal({ x: 220, y: 170 }, origin, 2);

        expect(toScreen(local, origin, 2)).toEqual({ x: 220, y: 170 });
    });

    it('should treat a zoom of 0 as 1 rather than producing Infinity', () => {
        // Review Focus 1. The zoom comes from a fixed list and should never
        // actually be 0, but the renderer template already guards the
        // viewport grips with `zoom() || 1` — the same caution applies here,
        // because a NaN in the label looks like a rendering bug, not a
        // numeric one.
        expect(toLocal({ x: 160, y: 90 }, origin, 0)).toEqual({ x: 60, y: 40 });
    });

    it('should hold for a stretch-layout origin at the stage edge', () => {
        // Review Focus 5: under `canvasLayout: 'stretch'`, `.demo-wrap` is
        // `display: block; width: 100%` — the origin differs, the arithmetic
        // does not. Nothing in the model depends on inline-block.
        expect(toLocal({ x: 12, y: 300 }, { x: 0, y: 0 }, 1)).toEqual({ x: 12, y: 300 });
    });
});

describe('measureDistance', () => {
    it('should measure an axis-aligned span', () => {
        expect(measureDistance({ x: 10, y: 10 }, { x: 10, y: 34 })).toBe(24);
    });

    it('should measure a diagonal', () => {
        expect(measureDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
    });

    it('should be zero for two identical points', () => {
        // Review Focus 2: a click without movement.
        expect(measureDistance({ x: 7, y: 7 }, { x: 7, y: 7 })).toBe(0);
    });
});

describe('tickEndpoints', () => {
    it('should put a tick across a vertical line', () => {
        // The order follows the normal vector and is meaningless for the
        // rendered SVG — pinned down here so it does not rotate unnoticed
        // and the two cases below drift apart.
        const [p, q] = tickEndpoints({ x: 10, y: 0 }, { x: 10, y: 40 }, 'a');

        expect(p).toEqual({ x: 13.5, y: 0 });
        expect(q).toEqual({ x: 6.5, y: 0 });
    });

    it('should put a tick across a horizontal line', () => {
        const [p, q] = tickEndpoints({ x: 0, y: 20 }, { x: 40, y: 20 }, 'b');

        expect(p).toEqual({ x: 40, y: 16.5 });
        expect(q).toEqual({ x: 40, y: 23.5 });
    });

    it('should produce finite coordinates for a zero-length measurement', () => {
        // Review Focus 2: without a guard, normalization divides by 0 and
        // the SVG gets NaN attributes, which the browser silently discards —
        // the measurement then simply vanishes, without an error.
        const [p, q] = tickEndpoints({ x: 5, y: 5 }, { x: 5, y: 5 }, 'a');

        expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true);
        expect(Number.isFinite(q.x) && Number.isFinite(q.y)).toBe(true);
    });
});

describe('labelPlacement', () => {
    it('should sit at the midpoint on a long span', () => {
        expect(labelPlacement({ x: 0, y: 0 }, { x: 0, y: 100 }, { x: 0, y: 50 })).toEqual({ x: 0, y: 50 });
    });

    it('should step aside on a span below the threshold', () => {
        // The 28px rule. At 24px, the number does not fit between the ticks.
        const placed = labelPlacement({ x: 50, y: 0 }, { x: 50, y: 24 }, { x: 0, y: 12 });

        expect(placed.y).toBe(12);
        expect(placed.x).toBe(65); // away from the reference point, by MEASURE_LABEL_OFFSET
    });

    it('should step aside away from the reference point', () => {
        const placed = labelPlacement({ x: 50, y: 0 }, { x: 50, y: 24 }, { x: 100, y: 12 });

        expect(placed.x).toBe(35);
    });

    it('should not step aside exactly at the threshold', () => {
        const span = MEASURE_LABEL_MIN_SPAN;
        const placed = labelPlacement({ x: 0, y: 0 }, { x: 0, y: span }, { x: 50, y: 0 });

        expect(placed).toEqual({ x: 0, y: span / 2 });
    });
});
