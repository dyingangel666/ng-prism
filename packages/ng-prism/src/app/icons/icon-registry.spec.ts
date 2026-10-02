import { ICON_NAMES } from './icon-registry.js';

describe('icon registry', () => {
    it('should carry a dedicated glyph for the measure tool', () => {
        // crosshair, move and ruler-dimension are already taken by guides,
        // rulers and the viewport width — the measuring tool needs its own,
        // otherwise two tools would share the same glyph side by side.
        expect(ICON_NAMES).toContain('ruler');
    });
});
