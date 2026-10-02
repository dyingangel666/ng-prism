import { MEASURE_LABEL_MIN_SPAN, MEASURE_LABEL_OFFSET, MEASURE_TICK_LENGTH } from '../../shared/measure.type.js';

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
 */
function safeZoom(zoom: number): number {
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
