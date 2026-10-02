import { type EdgeSide, MEASURE_SNAP_TOLERANCE, type SnapKind } from '../../shared/measure.type.js';
import type { Vec } from './measure-geometry.js';
import type { Box } from './measure-quad.js';

export type Sides = Record<EdgeSide, number>;

export interface ElementBox {
    rect: Box;
    border: Sides;
    padding: Sides;
}

export interface SnapTarget {
    kind: SnapKind;
    side: EdgeSide;
    /** Which coordinate the edge fixes — `left`/`right` are x, the other two are y. */
    axis: 'x' | 'y';
    at: number;
}

function parseSides(style: CSSStyleDeclaration, prefix: string, suffix: string): Sides {
    const read = (side: EdgeSide): number => parseFloat(style.getPropertyValue(`${prefix}-${side}${suffix}`)) || 0;

    return { top: read('top'), right: read('right'), bottom: read('bottom'), left: read('left') };
}

/**
 * The impure half: translating an element into plain numbers.
 *
 * Kept separate from {@link snapTargetsFor} so the edge arithmetic stays
 * testable without a DOM — the same relationship as between `getBoxModel()`
 * and its presentation in the box-model plugin.
 */
export function readElementBox(element: Element): ElementBox {
    const style = window.getComputedStyle(element);
    const r = element.getBoundingClientRect();

    return {
        rect: { left: r.left, top: r.top, right: r.right, bottom: r.bottom },
        border: parseSides(style, 'border', '-width'),
        padding: parseSides(style, 'padding', '')
    };
}

/** An element's border, padding and content edges — twelve of them. */
export function snapTargetsFor(box: ElementBox): SnapTarget[] {
    const { rect, border, padding } = box;
    const insets: Record<SnapKind, Sides> = {
        border: { top: 0, right: 0, bottom: 0, left: 0 },
        padding: border,
        content: {
            top: border.top + padding.top,
            right: border.right + padding.right,
            bottom: border.bottom + padding.bottom,
            left: border.left + padding.left
        }
    };
    const targets: SnapTarget[] = [];

    for (const kind of ['border', 'padding', 'content'] as const) {
        const i = insets[kind];

        targets.push({ kind, side: 'left', axis: 'x', at: rect.left + i.left });
        targets.push({ kind, side: 'right', axis: 'x', at: rect.right - i.right });
        targets.push({ kind, side: 'top', axis: 'y', at: rect.top + i.top });
        targets.push({ kind, side: 'bottom', axis: 'y', at: rect.bottom - i.bottom });
    }

    return targets;
}

/**
 * The edge a point snaps to — or `null`.
 *
 * `null` is not a failure case but an equally valid result: a free point.
 * A tool that always latched could not measure exactly the things that lie
 * between edges.
 */
export function nearestSnap(point: Vec, targets: readonly SnapTarget[], tolerance: number = MEASURE_SNAP_TOLERANCE): SnapTarget | null {
    let best: SnapTarget | null = null;
    let bestDistance = Infinity;

    for (const target of targets) {
        const distance = Math.abs((target.axis === 'x' ? point.x : point.y) - target.at);

        if (distance <= tolerance && distance < bestDistance) {
            best = target;
            bestDistance = distance;
        }
    }

    return best;
}
