import { afterNextRender, ChangeDetectionStrategy, Component, computed, DestroyRef, ElementRef, inject, signal } from '@angular/core';
import { MEASURE_SNAP_TOLERANCE, type MeasurePoint } from '../../shared/measure.type.js';
import { PrismCanvasService } from '../services/prism-canvas.service.js';
import { PrismMeasureService } from '../services/prism-measure.service.js';
import { PrismRendererService } from '../services/prism-renderer.service.js';
import { formatMeasure, labelPlacement, measureDistance, type RenderedLine, tickEndpoints, toHostSpace, toLocal, toScreen, type Vec } from './measure-geometry.js';
import { nudge } from './measure-keyboard.js';
import { type Box, quadLines, quadSpans } from './measure-quad.js';
import { nearestSnap, readElementBox, snapTargetsFor } from './measure-snap.js';

/**
 * The topmost element under a screen point that belongs to the specimen.
 *
 * `elementsFromPoint`, the plural one, and the loop are what make this work
 * at all. The overlay host sits above `.demo-wrap` (see the `z-index` in the
 * stylesheet and why it has to be there) and is the one layer that takes
 * pointer events across the whole stage — so the singular `elementFromPoint`
 * answers the overlay itself for every point over the specimen, `contains`
 * then rejects it, and snapping and alt-click anchoring both stop working
 * entirely. Walking the hit list past the overlay's own subtree is what
 * gives the element actually underneath it.
 *
 * The `contains` check stays, and is still not optional: the toolrail and
 * the viewport grips sit *above* the overlay, so they appear in the hit list
 * ahead of anything in the specimen. Only the first hit the rendered root
 * owns is the one the tool may latch onto.
 */
export function elementUnderPoint(x: number, y: number, root: Element | null): Element | null {
    if (!root) return null;

    for (const hit of document.elementsFromPoint(x, y)) {
        if (root.contains(hit)) return hit;
    }

    return null;
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
 * `elementsFromPoint` has above.
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

/**
 * Keyboard support here only operates a draft that already exists: nudge,
 * commit, cancel. There is deliberately no keyboard path to *start* one —
 * Spec §10 calls for Tab to step through the specimen's snap targets as the
 * accessible substitute for a pointer-down, and that is not built. Tab is
 * left strictly alone by `onKey` (see its doc, and `nudge`'s) precisely so
 * it stays free for that mechanism once it exists, rather than being
 * repurposed here as a stand-in. The `aria-label` below only promises what
 * this component actually does today; it does not mention Tab, because
 * nothing happens when a user presses it. What the real interaction should
 * be is still undecided — a tool covering the whole canvas cannot simply
 * grab Tab for its own stepping without first deciding how a keyboard user
 * gets back out, and that is a product decision, not one this task makes.
 */
@Component({
    selector: 'prism-canvas-measure',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './prism-canvas-measure.component.html',
    styleUrl: './prism-canvas-measure.component.css',
    host: {
        tabindex: '0',
        role: 'application',
        'aria-label': 'Measure tool. Arrow keys nudge the active point, Shift for a larger step, Enter commits, Escape clears.',
        '(keydown)': 'onKey($event)'
    }
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
     * `getBoundingClientRect()` inside `origin()`, `hostRect()`,
     * `specimenCentre()` and `boxOf()` is not itself a reactive signal:
     * without an explicit nudge like this one, nothing would tell `lines` to
     * re-run after a scroll or a resize, and the drawn lines would stay put
     * while the specimen moves out from under them. It covers the host's own
     * rect too, so reading that per evaluation costs no new trigger.
     */
    private readonly geometryTick = signal(0);

    /** Origin and zoom the projection runs from, in viewport coordinates. */
    private origin(): Vec {
        const wrap = this.el.nativeElement.parentElement?.querySelector('.demo-wrap');
        const r = wrap?.getBoundingClientRect();

        return { x: r?.left ?? 0, y: r?.top ?? 0 };
    }

    /**
     * The host's own rect — what every drawn coordinate is measured against.
     *
     * Read once per `lines()` / `hover()` evaluation and handed to
     * {@link toHostSpace}, which carries the full explanation of why the
     * subtraction exists at all.
     */
    private hostRect(): DOMRect {
        return this.el.nativeElement.getBoundingClientRect();
    }

    protected readonly lines = computed<RenderedLine[]>(() => {
        const zoom = this.canvas.zoom();

        // Read for the dependency, not the value — the same way
        // prism-canvas-rulers.component.ts forces a dependency on
        // themeService.theme() without using it. This is what makes a
        // scroll or a resize re-run this computed.
        this.geometryTick();

        const host = this.hostRect();
        const origin = this.origin();
        const centre = this.specimenCentre(host);
        const all = [...this.measure.pins().map((m) => ({ m, pinned: true })), ...(this.measure.draft() ? [{ m: this.measure.draft()!, pinned: false }] : [])];

        return all.map(({ m, pinned }) => {
            // toScreen answers in viewport coordinates, because that is the
            // space `origin` lives in and the space `pointAt` reads the
            // pointer in. toHostSpace is what turns that into the SVG's own
            // user coordinates; everything downstream — ticks, label, echoes
            // — is derived from the projected points and so follows.
            const a = toHostSpace(toScreen(m.a, origin, zoom), host);
            const b = toHostSpace(toScreen(m.b, origin, zoom), host);

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

        const host = this.hostRect();
        const a = this.boxOf(anchorEl, host);
        const t = this.boxOf(targetEl, host);
        const centre = { x: (t.left + t.right) / 2, y: (t.top + t.bottom) / 2 };

        // The DOM-bound half (boxOf) stops here; quadSpans/quadLines are
        // both pure and tested directly in measure-quad.spec.ts.
        return quadLines(quadSpans(a, t), centre, zoom);
    });

    /** The element under the pointer while alt-hovering, `null` otherwise. */
    private readonly hoverTarget = signal<Element | null>(null);

    /**
     * An element's current rectangle as a {@link Box}, already in host
     * space.
     *
     * Projected here rather than at the four call sites downstream: a box
     * that reached `quadSpans` in viewport coordinates would produce correct
     * *distances* — a constant offset cancels in a subtraction — and draw
     * them in the wrong place, which is the half that is actually visible.
     */
    private boxOf(element: Element, host: DOMRect): Box {
        const r = element.getBoundingClientRect();
        const topLeft = toHostSpace({ x: r.left, y: r.top }, host);
        const bottomRight = toHostSpace({ x: r.right, y: r.bottom }, host);

        return { left: topLeft.x, top: topLeft.y, right: bottomRight.x, bottom: bottomRight.y };
    }

    private specimenCentre(host: DOMRect): Vec {
        const r = this.renderer.renderedElement()?.getBoundingClientRect();

        return r ? toHostSpace({ x: r.left + r.width / 2, y: r.top + r.height / 2 }, host) : { x: 0, y: 0 };
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

    /**
     * Keyboard operation of the running draft.
     *
     * `Escape` and `Enter` act regardless of what `nudge` would say about the
     * key; everything else only matters while a draft is open.
     * `preventDefault` is called only on the branches that actually consumed
     * the key — never for `Tab`, which `nudge` returns `null` for and this
     * method then leaves untouched. Swallowing it here would break keyboard
     * navigation of the whole shell for the sake of a tool that, as shipped,
     * has nothing of its own to put Tab to — see `nudge`'s doc.
     */
    protected onKey(event: KeyboardEvent): void {
        if (event.key === 'Escape') {
            this.measure.cancelDraft();
            return;
        }
        if (event.key === 'Enter') {
            this.measure.commitDraft();
            event.preventDefault();
            return;
        }

        const draft = this.measure.draft();

        if (!draft) return;

        const moved = nudge(draft.b, event.key, event.shiftKey);

        if (!moved) return;
        this.measure.updateDraft({ ...moved, snap: null });
        event.preventDefault();
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
