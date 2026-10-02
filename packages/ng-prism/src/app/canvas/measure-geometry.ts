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
