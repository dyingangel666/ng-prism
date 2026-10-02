/**
 * Ein Messwert als Text, ohne Einheit.
 *
 * Die Einheit hängt der Aufrufer an: die primäre Messung trägt `px` wie die
 * Viewport-Maßlinie, der Vier-Seiten-Readout nicht, weil vier Mal `px` auf
 * engem Raum nur Rauschen ist.
 */
export function formatMeasure(cssPx: number): string {
    const rounded = Math.round(cssPx * 10) / 10;

    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}
