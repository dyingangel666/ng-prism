import { formatMeasure } from './measure-geometry.js';

describe('formatMeasure', () => {
    it('should drop the decimal on a whole value', () => {
        expect(formatMeasure(24)).toBe('24');
    });

    it('should keep one decimal on a fractional value', () => {
        // Der ganze Grund für die Nachkommastelle: 23.5 darf nicht wie 24
        // aussehen, sonst meldet das Werkzeug einen Abstand als rund, der es
        // nicht ist.
        expect(formatMeasure(23.5)).toBe('23.5');
    });

    it('should round to one decimal', () => {
        expect(formatMeasure(23.47)).toBe('23.5');
        expect(formatMeasure(23.44)).toBe('23.4');
    });

    it('should collapse a value that rounds to a whole number', () => {
        // Subpixel-Arithmetik liefert ständig 23.999999; "24" ist die ehrliche
        // Ausgabe, "24.0" nur Rauschen.
        expect(formatMeasure(23.999999)).toBe('24');
    });

    it('should format zero', () => {
        expect(formatMeasure(0)).toBe('0');
    });

    it('should format a negative value', () => {
        // Überlappende Boxen liefern negative Abstände; das Vorzeichen ist die
        // Information.
        expect(formatMeasure(-4.5)).toBe('-4.5');
    });
});
