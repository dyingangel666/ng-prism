import type { Vec } from './measure-geometry.js';

const STEP = 1;
const STEP_COARSE = 10;

/**
 * The moved point — or `null` when the key does not belong here.
 *
 * Tab is deliberately not one of `nudge`'s keys. Spec §10 reserves it for
 * stepping through the specimen's snap targets — the accessible substitute
 * for the pointer, and arguably the more precise input, not a consolation
 * prize for lacking one: edges are exactly what one wants to measure in the
 * first place. Arrow keys only come in afterwards, to nudge off an edge once
 * a free point is what's wanted; `nudge` only ever moves a point that
 * already exists, it does not place one. Someone will eventually be tempted
 * to fold Tab in here as "simpler" free-pixel movement — resist it, and see
 * `onKey` in the component for why returning `null` here (rather than the
 * unchanged point) is what makes that possible to resist safely.
 *
 * The step sizes are the pair Spec §10 fixes for this tool: 1px plain, 10px
 * with Shift.
 */
export function nudge(point: Vec, key: string, shift: boolean): Vec | null {
    const d = shift ? STEP_COARSE : STEP;

    switch (key) {
        case 'ArrowRight':
            return { x: point.x + d, y: point.y };
        case 'ArrowLeft':
            return { x: point.x - d, y: point.y };
        case 'ArrowDown':
            return { x: point.x, y: point.y + d };
        case 'ArrowUp':
            return { x: point.x, y: point.y - d };
        default:
            return null;
    }
}
