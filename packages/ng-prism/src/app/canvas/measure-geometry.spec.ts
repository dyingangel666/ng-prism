import { formatMeasure } from './measure-geometry.js';

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
