import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Where the measuring overlay sits in the stage's stack, and why it is not
 * free to move.
 *
 * The overlay shipped with no `z-index` at all, which is the one value it
 * cannot have. `.demo-wrap` is `position: relative` with a `transform` — a
 * stacking context of its own — and renders *after* `<prism-canvas-measure />`
 * in `prism-renderer.component.html`, so at `z-index: auto` the two are
 * painted in tree order and `.demo-wrap` wins. Every line and label over the
 * specimen was hidden behind it, every `pointerdown` over the specimen landed
 * on it instead of on the overlay, and alt-click anchoring — which by
 * definition requires clicking *on* an element — could not be entered at all.
 *
 * The naive repair trades that for a different bug, which is why the ceiling
 * below is asserted as hard as the floor: this is the only overlay on the
 * stage that takes pointer events across its whole area. Raised past the
 * background pill it covers that pill's Reset button, the failure `.vp-grip`
 * already documents; raised past the toolrail it covers the very button that
 * switches the tool off again.
 *
 * None of it is observable under jsdom — no layout, no paint, no hit testing —
 * so it is asserted against the source text, the way `viewport-css.spec.ts`
 * and `canvas-overlay-offsets.spec.ts` assert their own CSS invariants.
 */
const MEASURE_CSS = join(__dirname, 'prism-canvas-measure.component.css');
const PILL_CSS = join(__dirname, 'prism-canvas-bg-pill.component.css');
const RULERS_CSS = join(__dirname, 'prism-canvas-rulers.component.css');
const TOOLBAR_CSS = join(__dirname, 'prism-canvas-toolbar.component.css');
const RENDERER_CSS = join(__dirname, '../renderer/prism-renderer.component.css');

/** `src` with every block comment removed, so prose can never be mistaken for a rule. */
function withoutComments(src: string): string {
    return src.replace(/\/\*[\s\S]*?\*\//g, '');
}

/** The declarations inside the block a selector opens. */
function block(file: string, selector: string): string {
    const src = withoutComments(readFileSync(file, 'utf-8'));
    const start = src.indexOf(selector);

    if (start === -1) throw new Error(`selector not found: ${selector}`);
    const open = src.indexOf('{', start);

    return src.slice(open, src.indexOf('}', open));
}

/** The `z-index` a rule declares, or `null` when it declares none. */
function layer(file: string, selector: string): number | null {
    const found = /z-index:\s*(-?\d+)/.exec(block(file, selector));

    return found ? Number(found[1]) : null;
}

const OVERLAY = ':host {';

describe('measuring overlay layering', () => {
    it('declares a z-index at all', () => {
        expect(layer(MEASURE_CSS, OVERLAY)).not.toBeNull();
    });

    it('sits above .demo-wrap, which declares none', () => {
        // The whole reason a z-index is needed: a positioned element with any
        // positive z-index is painted after every `z-index: auto` positioned
        // element, regardless of tree order. If `.demo-wrap` ever took one of
        // its own, this comparison stops being enough and has to become a
        // numeric one — which is exactly what this assertion is here to catch.
        expect(layer(RENDERER_CSS, '.demo-wrap {')).toBeNull();
        expect(layer(MEASURE_CSS, OVERLAY)!).toBeGreaterThan(0);
    });

    it.each([
        ['the background pill', PILL_CSS, ':host {'],
        ['the rulers', RULERS_CSS, '.ruler-wrap {'],
        ['the viewport grips', RENDERER_CSS, '.vp-grip {'],
        ['the viewport dimension line', RENDERER_CSS, '.vp-dim {'],
        ['the toolrail', TOOLBAR_CSS, '.prism-toolrail {']
    ])('stays below %s', (_label, file, selector) => {
        const sibling = layer(file, selector);

        expect(sibling).not.toBeNull();
        expect(layer(MEASURE_CSS, OVERLAY)!).toBeLessThan(sibling!);
    });

    it('keeps everything it draws out of the hit test', () => {
        // The host is the layer that takes the pointer; its own SVG and label
        // layers must not, or the hit test lands on a measurement line instead
        // of on the specimen. `elementUnderPoint` walks past the host itself,
        // but it has no way to walk past a line that claims to be the thing
        // under the cursor.
        expect(block(MEASURE_CSS, '.m-svg,')).toContain('pointer-events: none');
    });
});
