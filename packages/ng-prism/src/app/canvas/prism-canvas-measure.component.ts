import { ChangeDetectionStrategy, Component, computed, DestroyRef, ElementRef, inject } from '@angular/core';
import { MEASURE_SNAP_TOLERANCE, type MeasurePoint } from '../../shared/measure.type.js';
import { PrismCanvasService } from '../services/prism-canvas.service.js';
import { PrismMeasureService } from '../services/prism-measure.service.js';
import { PrismRendererService } from '../services/prism-renderer.service.js';
import { formatMeasure, labelPlacement, measureDistance, tickEndpoints, toLocal, toScreen, type Vec } from './measure-geometry.js';
import { nearestSnap, readElementBox, snapTargetsFor } from './measure-snap.js';

/**
 * The element under a screen point, provided it belongs to the specimen.
 *
 * The `contains` check is not optional: the overlay itself, the toolrail and
 * the viewport grips all sit above the canvas, and without it
 * `elementFromPoint` returns that chrome instead of the component.
 * `pointer-events: none` on the overlay only covers its own layer.
 */
export function elementUnderPoint(x: number, y: number, root: Element | null): Element | null {
    if (!root) return null;
    const hit = document.elementFromPoint(x, y);

    return hit && root.contains(hit) ? hit : null;
}

interface RenderedLine {
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
     * tell.
     */
    echoes: Array<[Vec, Vec]>;
}

/**
 * A snap's edge as a line segment, crosswise to the edge's axis.
 *
 * The length is deliberately fixed rather than the full edge length: an echo
 * that retraces the whole element edge reads as a second measurement instead
 * of a footnote to the first.
 */
const ECHO_HALF_LENGTH = 14;

export function echoFor(point: MeasurePoint, screen: Vec): [Vec, Vec] | null {
    if (!point.snap) return null;
    const horizontal = point.snap.side === 'top' || point.snap.side === 'bottom';

    return horizontal
        ? [
              { x: screen.x - ECHO_HALF_LENGTH, y: screen.y },
              { x: screen.x + ECHO_HALF_LENGTH, y: screen.y }
          ]
        : [
              { x: screen.x, y: screen.y - ECHO_HALF_LENGTH },
              { x: screen.x, y: screen.y + ECHO_HALF_LENGTH }
          ];
}

@Component({
    selector: 'prism-canvas-measure',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './prism-canvas-measure.component.html',
    styleUrl: './prism-canvas-measure.component.css'
})
export class PrismCanvasMeasureComponent {
    private readonly el = inject(ElementRef<HTMLElement>);
    private readonly destroyRef = inject(DestroyRef);
    private readonly canvas = inject(PrismCanvasService);
    private readonly renderer = inject(PrismRendererService);
    protected readonly measure = inject(PrismMeasureService);

    /** Origin and zoom the projection runs from. */
    private origin(): Vec {
        const wrap = this.el.nativeElement.parentElement?.querySelector('.demo-wrap');
        const r = wrap?.getBoundingClientRect();

        return { x: r?.left ?? 0, y: r?.top ?? 0 };
    }

    protected readonly lines = computed<RenderedLine[]>(() => {
        const zoom = this.canvas.zoom();
        const origin = this.origin();
        const centre = this.specimenCentre();
        const all = [...this.measure.pins().map((m) => ({ m, pinned: true })), ...(this.measure.draft() ? [{ m: this.measure.draft()!, pinned: false }] : [])];

        return all.map(({ m, pinned }) => {
            const a = toScreen(m.a, origin, zoom);
            const b = toScreen(m.b, origin, zoom);

            return {
                a,
                b,
                tickA: tickEndpoints(a, b, 'a'),
                tickB: tickEndpoints(a, b, 'b'),
                label: labelPlacement(a, b, centre),
                text: `${formatMeasure(measureDistance(m.a, m.b))} px`,
                pinned,
                echoes: [echoFor(m.a, a), echoFor(m.b, b)].filter((e): e is [Vec, Vec] => e !== null)
            };
        });
    });

    private specimenCentre(): Vec {
        const r = this.renderer.renderedElement()?.getBoundingClientRect();

        return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : { x: 0, y: 0 };
    }

    /** A pointer point, snapped to the nearest edge, in local coordinates. */
    private pointAt(clientX: number, clientY: number): MeasurePoint {
        const zoom = this.canvas.zoom();
        const origin = this.origin();
        const hit = elementUnderPoint(clientX, clientY, this.renderer.renderedElement());
        const screen = { x: clientX, y: clientY };

        if (!hit) return { ...toLocal(screen, origin, zoom), snap: null };

        const target = nearestSnap(screen, snapTargetsFor(readElementBox(hit)), MEASURE_SNAP_TOLERANCE);

        if (!target) return { ...toLocal(screen, origin, zoom), snap: null };

        const snapped = target.axis === 'x' ? { x: target.at, y: clientY } : { x: clientX, y: target.at };

        return { ...toLocal(snapped, origin, zoom), snap: { kind: target.kind, side: target.side, from: hit } };
    }

    constructor() {
        const host = this.el.nativeElement;
        const down = (e: PointerEvent): void => {
            this.measure.beginDraft(this.pointAt(e.clientX, e.clientY));
            host.setPointerCapture(e.pointerId);
        };
        const move = (e: PointerEvent): void => {
            if (!this.measure.draft()) return;
            this.measure.updateDraft(this.pointAt(e.clientX, e.clientY));
        };
        const up = (): void => this.measure.commitDraft();

        host.addEventListener('pointerdown', down);
        host.addEventListener('pointermove', move);
        host.addEventListener('pointerup', up);
        this.destroyRef.onDestroy(() => {
            host.removeEventListener('pointerdown', down);
            host.removeEventListener('pointermove', move);
            host.removeEventListener('pointerup', up);
        });
    }
}
