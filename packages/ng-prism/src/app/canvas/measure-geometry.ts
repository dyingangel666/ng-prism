import { MEASURE_LABEL_MIN_SPAN, MEASURE_LABEL_OFFSET, MEASURE_TICK_LENGTH, type MeasurePoint, type SnapRef } from '../../shared/measure.type.js';

/**
 * A measured value as text, without a unit.
 *
 * The caller appends the unit: the primary measurement carries `px` like the
 * viewport dimension line does, the four-sided readout does not, because
 * four `px` in a small space is noise.
 */
export function formatMeasure(cssPx: number): string {
    const rounded = Math.round(cssPx * 10) / 10;

    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export interface Vec {
    x: number;
    y: number;
}

/** A measurement, reduced to exactly what the template draws. */
export interface RenderedLine {
    a: Vec;
    b: Vec;
    tickA: [Vec, Vec];
    tickB: [Vec, Vec];
    label: Vec;
    text: string;
    pinned: boolean;
    /**
     * The snapped-to edges, retraced as a dotted line (Spec §4.4).
     *
     * Without them you can see *that* the tool latched, but not *onto what*
     * — and with a 2px border, the border, padding and content edges sit
     * exactly 2 pixels apart. Which one was meant is otherwise impossible to
     * tell. Always empty for the alt-hover quad readout: a span between two
     * elements has no single snapped-to edge to retrace.
     */
    echoes: Array<[Vec, Vec]>;
}

/**
 * A zoom that is never 0.
 *
 * The same guard the renderer template gives the viewport grips with
 * `canvasService.zoom() || 1`. A division by zero here produces no visible
 * problem but an invisible one: `NaN` in an SVG attribute is silently
 * discarded, and the measurement simply vanishes.
 *
 * Exported rather than private because `measure-quad.ts` divides by zoom
 * too. It used to carry its own `|| 1`, which let a negative zoom straight
 * through and mirrored the measurement instead of dropping it — two guards
 * that disagree are worse than one, so there is only one.
 */
export function safeZoom(zoom: number): number {
    return zoom > 0 && Number.isFinite(zoom) ? zoom : 1;
}

/** Screen point -> `.demo-wrap`-local CSS pixels. */
export function toLocal(screen: Vec, origin: Vec, zoom: number): Vec {
    const z = safeZoom(zoom);

    return { x: (screen.x - origin.x) / z, y: (screen.y - origin.y) / z };
}

/** The reverse of {@link toLocal}. */
export function toScreen(local: Vec, origin: Vec, zoom: number): Vec {
    const z = safeZoom(zoom);

    return { x: origin.x + local.x * z, y: origin.y + local.y * z };
}

/**
 * Viewport coordinates -> the overlay host's own box.
 *
 * Every rect the measuring tool reads — `.demo-wrap`'s for the projection
 * origin, the specimen's for the label reference point, an element's for the
 * four-sided readout — comes out of `getBoundingClientRect()` and is
 * therefore measured from the top-left corner of the *window*. Nothing the
 * overlay draws lives in that space: the SVG is `inset: 0` on the host, so
 * its user coordinates start at the host's top-left corner, and `.m-label`
 * is placed with `left`/`top` against the same corner. The shell puts a
 * header above the stage and a sidebar beside it, so handing a viewport
 * coordinate straight to the template pushes every line, tick, echo and
 * label down and to the right by the stage's screen offset — largely off
 * the visible area, while the stored numbers stay perfectly correct.
 *
 * Pure, and taking the host rect rather than reading one, because jsdom has
 * no layout engine: every rect it reports is zero, so a test routed through
 * the DOM could not tell this subtraction from its absence. The same seam
 * `watchGeometry` opens for `ResizeObserver` in the component.
 */
export function toHostSpace(point: Vec, hostRect: { left: number; top: number }): Vec {
    return { x: point.x - hostRect.left, y: point.y - hostRect.top };
}

export function measureDistance(a: Vec, b: Vec): number {
    return Math.hypot(b.x - a.x, b.y - a.y);
}

/**
 * Direction and normal of the line.
 *
 * The length falls to 0 for two identical points; the normal is then set to
 * horizontal so the ticks have a defined direction instead of `NaN`.
 */
function basis(a: Vec, b: Vec): { nx: number; ny: number; len: number } {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy);

    if (len === 0) return { nx: 0, ny: 1, len: 0 };
    return { nx: -dy / len, ny: dx / len, len };
}

/** The two ends of the tick at point `at`, perpendicular to the line. */
export function tickEndpoints(a: Vec, b: Vec, at: 'a' | 'b'): [Vec, Vec] {
    const { nx, ny } = basis(a, b);
    const p = at === 'a' ? a : b;
    const h = MEASURE_TICK_LENGTH / 2;

    return [
        { x: p.x - nx * h, y: p.y - ny * h },
        { x: p.x + nx * h, y: p.y + ny * h }
    ];
}

/**
 * Where the value sits.
 *
 * At the midpoint, as long as the line is long enough. Below that,
 * perpendicular to the line, on the side that points away from `awayFrom` —
 * otherwise the number lands directly on what it describes for short spans
 * inside a single component.
 */
export function labelPlacement(a: Vec, b: Vec, awayFrom: Vec): Vec {
    const { nx, ny, len } = basis(a, b);
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };

    if (len >= MEASURE_LABEL_MIN_SPAN) return mid;

    const sign = (awayFrom.x - mid.x) * nx + (awayFrom.y - mid.y) * ny > 0 ? -1 : 1;

    return { x: mid.x + nx * MEASURE_LABEL_OFFSET * sign, y: mid.y + ny * MEASURE_LABEL_OFFSET * sign };
}

/**
 * The eight directions a constrained measurement may take, as exact unit
 * vectors.
 *
 * Written out rather than computed from `Math.cos`/`Math.sin`, because
 * `Math.cos(Math.PI / 2)` is 6.1e-17 and not zero. That residue would leave a
 * "vertical" measurement a hair off vertical — invisible on screen, but it
 * would make the guarantee this function exists to provide quietly false, and
 * every test of it would have to be written in tolerances instead of equality.
 */
const DIRECTIONS: readonly Vec[] = [
    { x: 1, y: 0 },
    { x: Math.SQRT1_2, y: Math.SQRT1_2 },
    { x: 0, y: 1 },
    { x: -Math.SQRT1_2, y: Math.SQRT1_2 },
    { x: -1, y: 0 },
    { x: -Math.SQRT1_2, y: -Math.SQRT1_2 },
    { x: 0, y: -1 },
    { x: Math.SQRT1_2, y: -Math.SQRT1_2 }
];

/**
 * The snap reference `point` may keep once it has been projected along `u`.
 *
 * A constraint forces one coordinate and preserves the other, so a latched
 * edge survives only when it lies on the preserved axis: forcing `y` keeps a
 * `left`/`right` edge, forcing `x` keeps a `top`/`bottom` one. A diagonal
 * moves the point on both axes at once and leaves it on no edge at all.
 *
 * Dropping it matters because the reference is what draws the dotted snap
 * echo. Carried over unchecked, the echo would mark an edge the point has
 * just been moved off — the tool would claim a precision it no longer has.
 */
function keptSnap(snap: SnapRef | null, u: Vec): SnapRef | null {
    if (!snap) return null;
    if (u.y === 0) return snap.side === 'left' || snap.side === 'right' ? snap : null;
    if (u.x === 0) return snap.side === 'top' || snap.side === 'bottom' ? snap : null;

    return null;
}

/**
 * `point`, pulled onto whichever of the eight 45-degree directions from `a` it
 * lies nearest.
 *
 * Held while dragging, this is what makes an exactly horizontal, vertical or
 * diagonal measurement reachable by hand — the same service Shift performs in
 * Photoshop, Illustrator and Figma, which is where the reach for that key
 * comes from.
 *
 * The projection is orthogonal rather than length-preserving: the component
 * across the chosen direction is dropped, not folded into the result. A drag
 * 240 across and 7 down therefore reports 240, which is the distance along the
 * line actually drawn. Preserving the raw length instead would print the
 * hypotenuse beside a line that is not the hypotenuse.
 *
 * Order matters at the call site. Edge snapping runs first and this runs on
 * its result, so the snap's contribution on the preserved axis survives: a
 * point latched to a left edge at x=338 and then forced horizontal stays at
 * x=338. Constraining first and snapping afterwards would bend the line back
 * off the axis the constraint was asked for.
 */
export function constrainDirection(a: Vec, point: MeasurePoint): MeasurePoint {
    const dx = point.x - a.x;
    const dy = point.y - a.y;

    // `atan2(0, 0)` is 0, which would silently pin a not-yet-moved drag to the
    // horizontal. There is no direction to snap to yet.
    if (dx === 0 && dy === 0) return point;

    const octant = (Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) + 8) % 8;
    const u = DIRECTIONS[octant];
    const along = dx * u.x + dy * u.y;

    return { x: a.x + along * u.x, y: a.y + along * u.y, snap: keptSnap(point.snap, u) };
}
