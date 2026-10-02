import type { EdgeSide } from '../../shared/measure.type.js';
import type { Vec } from './measure-geometry.js';

/** An axis-aligned box in `.demo-wrap`-local CSS pixels. */
export interface Box {
    left: number;
    top: number;
    right: number;
    bottom: number;
}

export interface QuadResult {
    top: number;
    right: number;
    bottom: number;
    left: number;
    /** True when the target lies entirely inside the anchor — see the explanation below. */
    contained: boolean;
}

/**
 * The distances between two boxes, border-box to border-box.
 *
 * Two reading modes, because two different questions sit behind them. When
 * the target lies **inside** the anchor, what you want is the four insets —
 * that is the case where 16/16 makes a container's padding visible. When the
 * boxes sit **beside** each other, there are no four insets, only a gap per
 * axis; reporting an inset there would mean presenting negative numbers as
 * distances.
 *
 * Partial overlap counts as "not contained": there, exactly one side would
 * go negative, and one negative inset next to three positive ones reads as a
 * measurement fault rather than as the statement "sticks out".
 *
 * A target that overlaps the anchor on both axes — the partial-overlap case
 * above included — reports zero on every side, because there is no gap on
 * either axis to put a number on. A caller that draws one measurement line
 * per non-zero side will then correctly draw no lines at all for that pair;
 * that is the intended reading, not a bug to chase down.
 */
export function quadDistances(anchor: Box, target: Box): QuadResult {
    const contained = target.left >= anchor.left && target.top >= anchor.top && target.right <= anchor.right && target.bottom <= anchor.bottom;

    if (contained) {
        return {
            top: target.top - anchor.top,
            right: anchor.right - target.right,
            bottom: anchor.bottom - target.bottom,
            left: target.left - anchor.left,
            contained: true
        };
    }

    const gapX = Math.max(0, Math.max(anchor.left - target.right, target.left - anchor.right));
    const gapY = Math.max(0, Math.max(anchor.top - target.bottom, target.top - anchor.bottom));

    return {
        top: target.bottom <= anchor.top ? gapY : 0,
        right: target.left >= anchor.right ? gapX : 0,
        bottom: target.top >= anchor.bottom ? gapY : 0,
        left: target.right <= anchor.left ? gapX : 0,
        contained: false
    };
}

export interface QuadSpan {
    a: Vec;
    b: Vec;
    value: number;
    side: EdgeSide;
}

/**
 * The four distances as drawable spans.
 *
 * Each span runs through the middle of the target, from the anchor edge to
 * the target edge, so that four simultaneous measurement lines don't cross
 * each other. Sides with no distance are dropped: a measurement line of
 * length 0 is not the statement "0 pixels" — it is no statement at all, and
 * two ticks stacked on top of each other read as a drawing fault.
 */
export function quadSpans(anchor: Box, target: Box): QuadSpan[] {
    const d = quadDistances(anchor, target);
    const cx = (target.left + target.right) / 2;
    const cy = (target.top + target.bottom) / 2;
    const all: QuadSpan[] = [
        { a: { x: cx, y: anchor.top }, b: { x: cx, y: target.top }, value: d.top, side: 'top' },
        { a: { x: target.right, y: cy }, b: { x: anchor.right, y: cy }, value: d.right, side: 'right' },
        { a: { x: cx, y: target.bottom }, b: { x: cx, y: anchor.bottom }, value: d.bottom, side: 'bottom' },
        { a: { x: anchor.left, y: cy }, b: { x: target.left, y: cy }, value: d.left, side: 'left' }
    ];

    return all.filter((s) => s.value !== 0);
}
