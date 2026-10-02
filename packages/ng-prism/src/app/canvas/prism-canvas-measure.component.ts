import { afterNextRender, ChangeDetectionStrategy, Component, computed, DestroyRef, ElementRef, inject, signal } from '@angular/core';
import { MEASURE_SNAP_TOLERANCE, type MeasurePoint } from '../../shared/measure.type.js';
import { PrismCanvasService } from '../services/prism-canvas.service.js';
import { PrismMeasureService } from '../services/prism-measure.service.js';
import { PrismRendererService } from '../services/prism-renderer.service.js';
import { formatMeasure, labelPlacement, measureDistance, type RenderedLine, tickEndpoints, toLocal, toScreen, type Vec } from './measure-geometry.js';
import { type Box, quadLines, quadSpans } from './measure-quad.js';
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

/**
 * Wires the two triggers that tell `lines` its drawn geometry might be
 * stale, and returns how to undo them.
 *
 * A `ResizeObserver` on `stage` and `wrap` covers window resize, panel
 * resize, and the specimen itself changing size. Resize alone is not enough
 * because scrolling moves the specimen without resizing anything — a
 * `ResizeObserver` does not fire on scroll — so `stage` also gets its own
 * `scroll` listener. Dropping either one leaves the lines drawn at a screen
 * position the specimen has since left, which is the worst impression a
 * measuring tool can make.
 *
 * Takes the `ResizeObserver` constructor as a parameter instead of reading
 * the global directly so the wiring stays testable without a real one:
 * jsdom does not implement `ResizeObserver` at all, the same gap
 * `elementFromPoint` has above.
 */
export function watchGeometry(stage: Element, wrap: Element | null, onChange: () => void, ResizeObserverCtor: typeof ResizeObserver = ResizeObserver): () => void {
    const ro = new ResizeObserverCtor(onChange);

    ro.observe(stage);
    if (wrap) ro.observe(wrap);
    stage.addEventListener('scroll', onChange);

    return () => {
        ro.disconnect();
        stage.removeEventListener('scroll', onChange);
    };
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

    /**
     * Bumped whenever geometry `lines` depends on might have moved without
     * touching zoom, pins or the draft — see {@link watchGeometry} below.
     *
     * `getBoundingClientRect()` inside `origin()` and `specimenCentre()` is
     * not itself a reactive signal: without an explicit nudge like this one,
     * nothing would tell `lines` to re-run after a scroll or a resize, and
     * the drawn lines would stay put while the specimen moves out from under
     * them.
     */
    private readonly geometryTick = signal(0);

    /** Origin and zoom the projection runs from. */
    private origin(): Vec {
        const wrap = this.el.nativeElement.parentElement?.querySelector('.demo-wrap');
        const r = wrap?.getBoundingClientRect();

        return { x: r?.left ?? 0, y: r?.top ?? 0 };
    }

    protected readonly lines = computed<RenderedLine[]>(() => {
        const zoom = this.canvas.zoom();

        // Read for the dependency, not the value — the same way
        // prism-canvas-rulers.component.ts forces a dependency on
        // themeService.theme() without using it. This is what makes a
        // scroll or a resize re-run this computed.
        this.geometryTick();

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

    /**
     * The up-to-four spans between the alt-hover anchor and the element
     * currently under the pointer.
     *
     * `quadSpans` already drops a side with nothing to say, so an anchor and
     * target that merely overlap correctly renders nothing at all — see its
     * doc on `measure-quad.ts`.
     */
    protected readonly hoverLines = computed<RenderedLine[]>(() => {
        const anchorEl = this.measure.hoverAnchor();
        const targetEl = this.hoverTarget();

        if (!anchorEl || !targetEl || anchorEl === targetEl) return [];

        const zoom = this.canvas.zoom();

        // Same dependency-only read that `lines` above makes on
        // `geometryTick`. `boxOf` reads `getBoundingClientRect()`, which is
        // not itself reactive: holding the pointer still over an unchanged
        // target does not re-set `hoverTarget` to a new value, so without
        // this a scroll or a resize during that hold would leave the readout
        // stale.
        this.geometryTick();

        const a = this.boxOf(anchorEl);
        const t = this.boxOf(targetEl);
        const centre = { x: (t.left + t.right) / 2, y: (t.top + t.bottom) / 2 };

        // The DOM-bound half (boxOf) stops here; quadSpans/quadLines are
        // both pure and tested directly in measure-quad.spec.ts.
        return quadLines(quadSpans(a, t), centre, zoom);
    });

    /** The element under the pointer while alt-hovering, `null` otherwise. */
    private readonly hoverTarget = signal<Element | null>(null);

    /** An element's current screen rectangle, as a {@link Box}. */
    private boxOf(element: Element): Box {
        const r = element.getBoundingClientRect();

        return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
    }

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
            // Held Alt: fix the element under the pointer as the hover
            // anchor instead of starting a drag measurement.
            if (e.altKey) {
                this.measure.setHoverAnchor(elementUnderPoint(e.clientX, e.clientY, this.renderer.renderedElement()));
                return;
            }
            this.measure.beginDraft(this.pointAt(e.clientX, e.clientY));
            host.setPointerCapture(e.pointerId);
        };
        const move = (e: PointerEvent): void => {
            // Held Alt: track the element under the pointer as the hover
            // target instead of updating a drag measurement in progress.
            if (e.altKey) {
                this.hoverTarget.set(elementUnderPoint(e.clientX, e.clientY, this.renderer.renderedElement()));
                return;
            }
            this.hoverTarget.set(null);
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

        // Deferred the same way box-model-overlay.component.ts defers its
        // own read of `parentElement`: the host is not reliably attached to
        // its final place in the stage yet while the constructor is running.
        afterNextRender(() => {
            const stage = host.parentElement;

            if (!stage) return;
            const wrap = stage.querySelector('.demo-wrap');

            this.destroyRef.onDestroy(watchGeometry(stage, wrap, () => this.geometryTick.update((v) => v + 1)));
        });
    }
}
