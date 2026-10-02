/**
 * The measuring tool measures geometry, not cascade: a point knows the edge
 * it sits on, but not the CSS property that produced it. Mapping pixels to a
 * property is deliberately a follow-up step, see Spec §13.
 */
export type SnapKind = 'border' | 'padding' | 'content';

export type EdgeSide = 'top' | 'right' | 'bottom' | 'left';

/** What a point snapped to — `null` when no target was within tolerance. */
export interface SnapRef {
    kind: SnapKind;
    side: EdgeSide;
    from: Element;
}

/**
 * A measure point in `.demo-wrap`-local CSS pixels.
 *
 * Not in screen coordinates: `.demo-wrap` carries
 * `transform: scale(var(--zoom))`, and local coordinates turn the distance
 * into a CSS-pixel distance with no further division. Zooming after a pin is
 * placed then does not shift it relative to the specimen.
 */
export interface MeasurePoint {
    x: number;
    y: number;
    snap: SnapRef | null;
}

export interface Measurement {
    a: MeasurePoint;
    b: MeasurePoint;
}

/**
 * How close the pointer has to come to an edge, in **screen** pixels.
 *
 * Screen and not document pixels, because the tolerance describes a
 * precision of the hand and not a property of the document: it has to feel
 * the same at 50% zoom as at 200%. Same value as `VIEWPORT_SNAP_TOLERANCE`,
 * for the same reason.
 */
export const MEASURE_SNAP_TOLERANCE = 8;

/**
 * The span, in CSS pixels, above which the value fits between the end ticks.
 *
 * Below it the ticks and the number overlap, and the measurement becomes
 * unreadable exactly where it needs to be most precise. The value then
 * moves outside instead.
 */
export const MEASURE_LABEL_MIN_SPAN = 28;

/** How far the value steps aside, perpendicular to the line, for short spans. */
export const MEASURE_LABEL_OFFSET = 15;

/** Length of an end tick, centered on the endpoint. */
export const MEASURE_TICK_LENGTH = 7;
