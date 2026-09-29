import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The three CSS invariants the viewport constraint rests on.
 *
 * None of them can be asserted against a rendered DOM: this package's specs run
 * under jsdom, which resolves no `var()`, and `PrismRendererComponent` uses
 * `viewChild.required`, which JIT cannot instantiate from SWC-compiled sources.
 * So they are asserted against the stylesheet text, the way
 * `canvas-overlay-offsets.spec.ts` asserts the overlay offsets.
 *
 * Each of the three fails silently if it breaks — a wrong `container-type`
 * moves every visual-regression baseline while the canvas still looks right,
 * and grips that read a custom property nobody publishes simply sit at the
 * centre of the stage.
 */
const RENDERER = join(__dirname, '../renderer/prism-renderer.component.ts');

/** The declarations inside the block a selector opens. */
function block(selector: string): string {
  const src = readFileSync(RENDERER, 'utf-8');
  const start = src.indexOf(selector);
  if (start === -1) throw new Error(`selector not found: ${selector}`);
  const open = src.indexOf('{', start);
  const close = src.indexOf('}', open);
  return src.slice(open + 1, close);
}

describe('viewport CSS invariants', () => {
  it('publishes --vp-w on the stage, so overlays outside .demo-wrap can read it', () => {
    const src = readFileSync(RENDERER, 'utf-8');
    // Bound on the stage element, not on .demo-wrap: the grips are siblings of
    // .demo-wrap and could not inherit it from there.
    expect(src).toContain('[style.--vp-w.px]="canvasService.viewportWidth()"');
    expect(src).toContain('class="prism-canvas-stage"');
  });

  it('confines container-type to the constrained state', () => {
    // container-type: inline-size implies contain: inline-size. On the
    // width:auto inline-block that .demo-wrap is at rest, that would decouple
    // its width from its contents and shift every recorded VRT baseline.
    const resting = block('.demo-wrap {');
    expect(resting).not.toContain('container-type');

    const constrained = block('.demo-wrap[data-viewport] {');
    expect(constrained).toContain('container-type: inline-size');
  });

  it('lets an explicit viewport width out of the stretch layout cap', () => {
    const constrained = block('.demo-wrap[data-viewport] {');
    expect(constrained).toContain('width: var(--vp-w)');
    expect(constrained).toContain('max-width: none');
  });

  it('derives both grip positions from --vp-w rather than measuring', () => {
    const src = readFileSync(RENDERER, 'utf-8');
    // .demo-wrap is centred in the stage, so each edge is half the width away
    // from the middle. No ResizeObserver, no getBoundingClientRect.
    expect(src).toContain('calc(50% - var(--vp-w) / 2');
    expect(src).not.toContain('getBoundingClientRect');
  });
});
