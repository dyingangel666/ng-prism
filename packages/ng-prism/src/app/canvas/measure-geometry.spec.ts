import { type EdgeSide, MEASURE_LABEL_MIN_SPAN, type MeasurePoint } from '../../shared/measure.type.js';
import { constrainDirection, formatMeasure, labelPlacement, measureDistance, quantizeFree, tickEndpoints, toHostSpace, toLocal, toScreen } from './measure-geometry.js';

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
        //
        // The origin has to be non-zero for this to test anything at all. At
        // {0, 0} with zoom 1 the function is the identity, and the assertion
        // held just as well for `(s + o) * z`, `s * z - o` or a bare `s` —
        // it could not have failed for the reason the paragraph above gives.
        // A stretch `.demo-wrap` spans the stage's content box, so its origin
        // is the stage's padding (32px) plus whatever the shell puts to the
        // left of and above the stage.
        expect(toLocal({ x: 12, y: 300 }, { x: 240, y: 96 }, 1)).toEqual({ x: -228, y: 204 });
    });
});

describe('toHostSpace', () => {
    it('should subtract the host origin from a viewport point', () => {
        // The one thing that stands between a correct measurement and one
        // drawn off the visible canvas. Everything the overlay reads comes out
        // of getBoundingClientRect() and is therefore measured from the corner
        // of the window; everything it draws is measured from the corner of
        // the host. A point the pointer touched at viewport (500, 300), with
        // the overlay host starting at viewport (300, 120), belongs at (200,
        // 180) in the SVG — not at (500, 300), which on a shell with a header
        // and a sidebar lands outside the stage entirely.
        expect(toHostSpace({ x: 500, y: 300 }, { left: 300, top: 120 })).toEqual({ x: 200, y: 180 });
    });

    it('should be the identity for a host at the window corner', () => {
        expect(toHostSpace({ x: 40, y: 90 }, { left: 0, top: 0 })).toEqual({ x: 40, y: 90 });
    });

    it('should produce negative coordinates above and left of the host', () => {
        // Not an error case: the stage scrolls, so a pinned measurement can
        // legitimately sit off the top of the overlay, and an SVG draws
        // negative coordinates perfectly happily.
        expect(toHostSpace({ x: 10, y: 10 }, { left: 300, top: 120 })).toEqual({ x: -290, y: -110 });
    });

    it('should accept a DOMRect-shaped host without reading anything else off it', () => {
        // The production caller hands it `host.getBoundingClientRect()`
        // whole. Only `left` and `top` may ever be used: width and height
        // belong to the host's own box, not to the point being projected.
        const rect = { left: 64, top: 48, right: 1024, bottom: 768, width: 960, height: 720, x: 64, y: 48 };

        expect(toHostSpace({ x: 100, y: 100 }, rect)).toEqual({ x: 36, y: 52 });
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

describe('constrainDirection', () => {
    const el = {} as Element;
    const free = (x: number, y: number): MeasurePoint => ({ x, y, snap: null });
    const snapped = (x: number, y: number, side: EdgeSide): MeasurePoint => ({ x, y, snap: { kind: 'border', side, from: el } });

    it('should force a near-horizontal drag onto the horizontal', () => {
        // The projection is orthogonal, so the 7px of vertical drift is
        // dropped rather than folded into the length: 240 across, not 240.1.
        expect(constrainDirection({ x: 100, y: 200 }, free(340, 207))).toEqual(free(340, 200));
    });

    it('should force a near-vertical drag onto the vertical', () => {
        expect(constrainDirection({ x: 100, y: 200 }, free(107, 440))).toEqual(free(100, 440));
    });

    it('should hold an exact diagonal', () => {
        const r = constrainDirection({ x: 0, y: 0 }, free(100, 100));

        expect(r.x).toBeCloseTo(100, 6);
        expect(r.y).toBeCloseTo(100, 6);
    });

    it('should pull a near-diagonal onto the exact diagonal', () => {
        const r = constrainDirection({ x: 0, y: 0 }, free(100, 90));

        expect(r.x).toBeCloseTo(95, 6);
        expect(r.y).toBeCloseTo(95, 6);
    });

    it('should choose the axis just inside the 22.5 degree boundary', () => {
        const r = constrainDirection({ x: 0, y: 0 }, free(100, 40));

        expect(r.x).toBeCloseTo(100, 6);
        expect(r.y).toBeCloseTo(0, 6);
    });

    it('should choose the diagonal just outside the 22.5 degree boundary', () => {
        const r = constrainDirection({ x: 0, y: 0 }, free(100, 43));

        expect(r.x).toBeCloseTo(71.5, 6);
        expect(r.y).toBeCloseTo(71.5, 6);
    });

    it('should leave a zero-length drag alone', () => {
        // atan2(0, 0) is 0, which would silently constrain to the horizontal.
        // There is no direction to snap yet, so the point is returned as it is.
        expect(constrainDirection({ x: 5, y: 5 }, free(5, 5))).toEqual(free(5, 5));
    });

    it('should keep a vertical-edge snap under a horizontal constraint', () => {
        // The constraint forces y and preserves x, so a left/right edge the
        // point latched onto is still the edge it sits on.
        expect(constrainDirection({ x: 100, y: 200 }, snapped(338, 207, 'left'))).toEqual(snapped(338, 200, 'left'));
    });

    it('should drop a horizontal-edge snap under a horizontal constraint', () => {
        // Forcing y moves the point off the top edge it latched onto. Keeping
        // the reference would draw a snap echo on an edge the point has left.
        expect(constrainDirection({ x: 100, y: 200 }, snapped(338, 207, 'top'))).toEqual(free(338, 200));
    });

    it('should drop any snap under a diagonal constraint', () => {
        // A diagonal projection moves the point on both axes at once, so it
        // sits on no edge at all.
        const r = constrainDirection({ x: 0, y: 0 }, snapped(100, 90, 'left'));

        expect(r.snap).toBeNull();
    });
});

describe('quantizeFree', () => {
    const el = {} as Element;
    const free = (x: number, y: number): MeasurePoint => ({ x, y, snap: null });
    const on = (x: number, y: number, side: EdgeSide): MeasurePoint => ({ x, y, snap: { kind: 'border', side, from: el } });

    it('should round both axes of a free point', () => {
        // Nothing here came from the document: a free point is the cursor
        // minus the specimen's own offset, and that offset is fractional
        // because .demo-wrap is centred. The decimals describe where the
        // specimen happens to sit, not what is being measured.
        expect(quantizeFree(free(824.3594, 338.5938))).toEqual(free(824, 339));
    });

    it('should keep x exact and round y under a left-edge snap', () => {
        // x is the edge the point latched onto — real geometry. y is still
        // the raw cursor and carries the same offset a free point does.
        expect(quantizeFree(on(338.5, 207.4, 'left'))).toEqual(on(338.5, 207, 'left'));
    });

    it('should keep x exact and round y under a right-edge snap', () => {
        expect(quantizeFree(on(338.5, 207.4, 'right'))).toEqual(on(338.5, 207, 'right'));
    });

    it('should keep y exact and round x under a top-edge snap', () => {
        expect(quantizeFree(on(338.4, 207.5, 'top'))).toEqual(on(338, 207.5, 'top'));
    });

    it('should keep y exact and round x under a bottom-edge snap', () => {
        expect(quantizeFree(on(338.4, 207.5, 'bottom'))).toEqual(on(338, 207.5, 'bottom'));
    });

    it('should leave an already whole point alone', () => {
        expect(quantizeFree(free(340, 200))).toEqual(free(340, 200));
    });

    it('should round a half upwards, and the same way for negatives', () => {
        // `Math.round` breaks ties toward positive infinity, so -0.5 goes to 0
        // rather than to -1. Pinned because a later switch to a symmetric
        // rounding would move every measurement that lands exactly on a half.
        expect(quantizeFree(free(0.5, 1.5))).toEqual(free(1, 2));
        expect(quantizeFree(free(-0.5, -1.5))).toEqual(free(-0, -1));
    });

    it('should carry the snap reference through untouched', () => {
        const point = on(338.5, 207.4, 'left');

        expect(quantizeFree(point).snap).toBe(point.snap);
    });
});
