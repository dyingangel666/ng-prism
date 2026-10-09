import { nudge } from './measure-keyboard.js';

const p = { x: 10, y: 10 };

describe('nudge', () => {
    it('should move one pixel per arrow press', () => {
        expect(nudge(p, 'ArrowRight', false)).toEqual({ x: 11, y: 10 });
        expect(nudge(p, 'ArrowLeft', false)).toEqual({ x: 9, y: 10 });
        expect(nudge(p, 'ArrowDown', false)).toEqual({ x: 10, y: 11 });
        expect(nudge(p, 'ArrowUp', false)).toEqual({ x: 10, y: 9 });
    });

    it('should move ten pixels with shift', () => {
        expect(nudge(p, 'ArrowRight', true)).toEqual({ x: 20, y: 10 });
    });

    it('should return null for a key it does not own', () => {
        // `null` rather than the unchanged point, so the caller knows whether
        // it may call `preventDefault` — a `Tab` this tool swallowed would
        // break keyboard navigation of the whole shell.
        expect(nudge(p, 'Tab', false)).toBeNull();
        expect(nudge(p, 'a', false)).toBeNull();
    });
});
