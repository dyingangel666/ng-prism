import { effect, inject, Injectable, signal } from '@angular/core';
import type { Measurement, MeasurePoint } from '../../shared/measure.type.js';
import { PrismNavigationService } from './prism-navigation.service.js';
import { PrismRendererService } from './prism-renderer.service.js';

/**
 * The transient state of the measuring tool.
 *
 * Deliberately separate from `PrismCanvasService`, which holds durable
 * preferences: the toggle lives there, the measurements live here. None of
 * this is persisted — rescuing a half-finished measurement across a reload
 * would be a burden, not a convenience.
 */
@Injectable({ providedIn: 'root' })
export class PrismMeasureService {
    private readonly navigation = inject(PrismNavigationService);
    private readonly renderer = inject(PrismRendererService);

    private readonly _draft = signal<Measurement | null>(null);
    private readonly _pins = signal<readonly Measurement[]>([]);
    private readonly _hoverAnchor = signal<Element | null>(null);

    /** The measurement in progress, for as long as the pointer is down. */
    readonly draft = this._draft.asReadonly();

    /** Pinned measurements, in the order they were set. */
    readonly pins = this._pins.asReadonly();

    /** The element fixed by click for alt-hover mode. */
    readonly hoverAnchor = this._hoverAnchor.asReadonly();

    constructor() {
        // The same mechanism by which PrismVariantBgService lets its override
        // lapse. Both are statements about *this* variant.
        effect(() => {
            this.navigation.activeComponent();
            this.renderer.activeVariantIndex();
            this.clearAll();
        });
    }

    beginDraft(a: MeasurePoint): void {
        this._draft.set({ a, b: a });
    }

    updateDraft(b: MeasurePoint): void {
        this._draft.update((d) => (d ? { a: d.a, b } : null));
    }

    commitDraft(): void {
        const draft = this._draft();

        if (!draft) return;
        this._pins.update((pins) => [...pins, draft]);
        this._draft.set(null);
    }

    cancelDraft(): void {
        this._draft.set(null);
    }

    removePin(index: number): void {
        this._pins.update((pins) => pins.filter((_, i) => i !== index));
    }

    setHoverAnchor(element: Element | null): void {
        this._hoverAnchor.set(element);
    }

    /**
     * What happens when the tool is switched off.
     *
     * Deliberately not `clearAll()`: the toggle is a mode, not a reset. Anyone
     * who hits the rail by accident must not lose the pinned measurements —
     * the running one, on the other hand, no longer makes sense without a
     * pointer, and an anchor with no visible overlay even less so.
     */
    suspend(): void {
        this._draft.set(null);
        this._hoverAnchor.set(null);
    }

    clearAll(): void {
        this._draft.set(null);
        this._pins.set([]);
        this._hoverAnchor.set(null);
    }
}
