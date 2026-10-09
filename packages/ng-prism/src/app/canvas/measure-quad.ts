import type { EdgeSide } from '../../shared/measure.type.js';
import { formatMeasure, labelPlacement, type RenderedLine, safeZoom, tickEndpoints, type Vec } from './measure-geometry.js';

/** An axis-aligned box in `.demo-wrap`-local CSS pixels. */
export interface Box {
    left: number;
    top: number;
    right: number;
    bottom: number;
}

/** A box in the form an SVG `<rect>` takes. */
export interface OutlineRect {
    x: number;
    y: number;
    width: number;
    height: number;
}

/**
 * A {@link Box} as an SVG `<rect>`.
 *
 * Spec §4.5 asks for the anchor and the target to be outlined alongside the
 * four numbers, and `<rect>` wants an origin and a size where `Box` carries
 * two opposite corners. Trivial arithmetic, kept out of the component for
 * the same reason the rest of this module is: the component should hold
 * nothing but the DOM reads.
 */
export function outlineOf(box: Box): OutlineRect {
    return { x: box.left, y: box.top, width: box.right - box.left, height: box.bottom - box.top };
}

export interface QuadResult {
    top: number;
    right: number;
    bottom: number;
    left: number;
    /** True when one box lies entirely inside the other, in either order — see the explanation below. */
    contained: boolean;
}

/** True when `inner` lies entirely inside `outer`, shared edges included. */
function within(inner: Box, outer: Box): boolean {
    return inner.left >= outer.left && inner.top >= outer.top && inner.right <= outer.right && inner.bottom <= outer.bottom;
}

/**
 * The two boxes as container and contained, or `null` when neither holds
 * the other.
 *
 * Which of the two was picked first says nothing about which one is the
 * container: alt-clicking a label and hovering its card asks exactly the
 * question that alt-clicking the card and hovering the label does. Checking
 * only the target-inside-anchor order sent the other one to the disjoint
 * reading, where two nested boxes overlap on both axes and every side comes
 * back 0 — two outlines on screen and not a single number between them.
 */
function nesting(anchor: Box, target: Box): { outer: Box; inner: Box } | null {
    if (within(target, anchor)) return { outer: anchor, inner: target };
    if (within(anchor, target)) return { outer: target, inner: anchor };

    return null;
}

/**
 * The point the spans run through: the middle of the inner box when one
 * contains the other, the middle of the target otherwise.
 *
 * Exported because `quadLines` needs the same point to place short labels
 * away from, and both orders of a containment have to agree on it — or the
 * same reading would put its labels on different sides depending on which
 * box was clicked first.
 */
export function quadCentre(anchor: Box, target: Box): Vec {
    const { left, top, right, bottom } = nesting(anchor, target)?.inner ?? target;

    return { x: (left + right) / 2, y: (top + bottom) / 2 };
}

/**
 * The distances between two boxes, border-box to border-box.
 *
 * Two reading modes, because two different questions sit behind them. When
 * one box lies **inside** the other (in either order, see {@link nesting}),
 * what you want is the four insets — that is the case where 16/16 makes a
 * container's padding visible. When the boxes sit **beside** each other,
 * there are no four insets, only a gap per axis; reporting an inset there
 * would mean presenting negative numbers as distances.
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
    const nested = nesting(anchor, target);

    if (nested) {
        const { outer, inner } = nested;

        return {
            top: inner.top - outer.top,
            right: outer.right - inner.right,
            bottom: outer.bottom - inner.bottom,
            left: inner.left - outer.left,
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
 * Each span runs through {@link quadCentre}, so that four simultaneous
 * measurement lines don't cross each other, and covers exactly the distance
 * it is labelled with. Nested boxes span from the outer edge in to the inner
 * one. Disjoint boxes span the gap between the two edges that *face* each
 * other — measured from the anchor's edge to the target's far one instead,
 * the line overshot the gap by the whole target, and a heading 4px above its
 * subtitle drew a 24px line labelled 4.
 *
 * Sides with no distance are dropped: a measurement line of length 0 is not
 * the statement "0 pixels" — it is no statement at all, and two ticks
 * stacked on top of each other read as a drawing fault.
 */
export function quadSpans(anchor: Box, target: Box): QuadSpan[] {
    const d = quadDistances(anchor, target);
    const nested = nesting(anchor, target);
    const { x: cx, y: cy } = quadCentre(anchor, target);
    // Per side, the two coordinates the span runs between along its axis —
    // top and left first, so every span points the same way in both readings.
    const [top, right, bottom, left] = nested
        ? [
              [nested.outer.top, nested.inner.top],
              [nested.inner.right, nested.outer.right],
              [nested.inner.bottom, nested.outer.bottom],
              [nested.outer.left, nested.inner.left]
          ]
        : [
              [target.bottom, anchor.top],
              [anchor.right, target.left],
              [anchor.bottom, target.top],
              [target.right, anchor.left]
          ];
    const all: QuadSpan[] = [
        { a: { x: cx, y: top[0] }, b: { x: cx, y: top[1] }, value: d.top, side: 'top' },
        { a: { x: right[0], y: cy }, b: { x: right[1], y: cy }, value: d.right, side: 'right' },
        { a: { x: cx, y: bottom[0] }, b: { x: cx, y: bottom[1] }, value: d.bottom, side: 'bottom' },
        { a: { x: left[0], y: cy }, b: { x: left[1], y: cy }, value: d.left, side: 'left' }
    ];

    return all.filter((s) => s.value !== 0);
}

/**
 * Turns spans into the exact shape the template draws, using the same
 * tick/label helpers the primary drag measurement uses.
 *
 * Every hover line is unpinned and carries no snap echoes — an element-to-
 * element span has no single snapped-to edge to retrace. The value is
 * divided by `zoom` because `quadSpans`' boxes come from
 * `getBoundingClientRect` and so arrive in screen pixels, unlike the drag
 * measurement's points, which are already `.demo-wrap`-local CSS pixels; the
 * division goes through `safeZoom`, the same guard `toLocal` and `toScreen`
 * use, so that a zoom of 0 cannot turn the text into `NaN` and a negative
 * one cannot flip the sign of every reading. The text itself carries no
 * unit: four `px` values in a tight space would be noise, the same
 * reasoning `formatMeasure`'s own doc gives.
 */
export function quadLines(spans: QuadSpan[], centre: Vec, zoom: number): RenderedLine[] {
    const z = safeZoom(zoom);

    return spans.map(({ a, b, value }) => ({
        a,
        b,
        tickA: tickEndpoints(a, b, 'a'),
        tickB: tickEndpoints(a, b, 'b'),
        label: labelPlacement(a, b, centre),
        text: formatMeasure(value / z),
        pinned: false,
        echoes: []
    }));
}

/**
 * The same four values as one line of text, for the live region.
 *
 * The drawn readout drops the unit and relies on position to say which side
 * each number belongs to — neither of which survives being read aloud, so
 * this names the side and keeps the `px`. Without it the four-sided readout
 * is announced to nobody: the live region only ever carried the drag
 * measurement, and alt-hover never produces one.
 */
export function quadSummary(spans: QuadSpan[], zoom: number): string {
    const z = safeZoom(zoom);

    return spans.map(({ side, value }) => `${side} ${formatMeasure(value / z)} px`).join(', ');
}
