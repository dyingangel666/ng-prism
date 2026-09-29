import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The four CSS invariants the viewport constraint rests on.
 *
 * None of them can be asserted against a rendered DOM: this package's specs run
 * under jsdom, which resolves no `var()`, and `PrismRendererComponent` uses
 * `viewChild.required`, which JIT cannot instantiate from SWC-compiled sources.
 * So they are asserted against the stylesheet text, the way
 * `canvas-overlay-offsets.spec.ts` asserts the overlay offsets.
 *
 * Each of the four fails silently if it breaks — a wrong `container-type`
 * moves every visual-regression baseline while the canvas still looks right, a
 * grip that reads a custom property nobody publishes simply sits at the centre
 * of the stage, and one that ignores zoom cuts through the middle of the very
 * component it is supposed to bound.
 */
const RENDERER = join(__dirname, '../renderer/prism-renderer.component.ts');

/**
 * `src` with every block comment removed.
 *
 * Without this, a selector named only in prose — e.g. a future comment that
 * happens to discuss `.demo-wrap {` — would be indistinguishable from the rule
 * that declares it, and `block()` below would silently slice comment text.
 */
function withoutComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '');
}

/** The declarations inside the block a selector opens. Comments are stripped
 *  first, so this can only ever match a real CSS rule. */
function block(selector: string): string {
  const src = withoutComments(readFileSync(RENDERER, 'utf-8'));
  const start = src.indexOf(selector);
  if (start === -1) throw new Error(`selector not found: ${selector}`);
  const open = src.indexOf('{', start);
  const close = src.indexOf('}', open);
  return src.slice(open + 1, close);
}

/**
 * The opening tag (attributes and all) of the element whose tag contains
 * `marker` — typically a `class="..."` literal.
 *
 * Narrower than searching the whole file: `[style.--vp-w.px]` bound on the
 * wrong element would still make a file-wide "does this substring exist
 * anywhere" check pass, which is exactly the defect this constraint depends
 * on catching (see the first test below).
 */
function openingTag(marker: string): string {
  const src = readFileSync(RENDERER, 'utf-8');
  const markerPos = src.indexOf(marker);
  if (markerPos === -1) throw new Error(`marker not found: ${marker}`);
  const tagStart = src.lastIndexOf('<', markerPos);
  const tagEnd = src.indexOf('>', markerPos);
  return src.slice(tagStart, tagEnd + 1);
}

describe('viewport CSS invariants', () => {
  it('publishes --vp-w on the stage, not on .demo-wrap, so the grips (its siblings) can still read it', () => {
    // The grips are outside .demo-wrap. Moving the binding from the stage's
    // tag onto .demo-wrap's would still contain the substring somewhere in the
    // file, but the grips would then read an unset --vp-w, their calc() would
    // fall back to auto, and both would silently collapse to the stage centre.
    const stageTag = openingTag('class="prism-canvas-stage"');
    expect(stageTag).toContain(
      '[style.--vp-w.px]="canvasService.viewportWidth()"'
    );

    const demoWrapTag = openingTag('class="demo-wrap"');
    expect(demoWrapTag).not.toContain('--vp-w');
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
    // A plain substring check for "width: var(--vp-w)" would also match
    // inside "max-width: var(--vp-w)" — the lookbehind rules that out.
    expect(constrained).toMatch(/(?<!-)width:\s*var\(--vp-w\)/);
    expect(constrained).toContain('max-width: none');
  });

  it('derives both grip positions from --vp-w and --zoom rather than measuring', () => {
    // .demo-wrap is centred in the stage and then scaled in place by --zoom,
    // so each edge sits half the *painted* width — --vp-w times --zoom — away
    // from the middle. Checked per rule rather than file-wide: a single
    // occurrence (e.g. .vp-grip--end regressing to a bare `right: 0`) would
    // still satisfy a check that only asks whether the pattern exists
    // somewhere in the file. Likewise, `getBoundingClientRect` is checked only
    // against these two rules — a file-wide ban would fire on any unrelated
    // future renderer feature that legitimately measures.
    const left = block('.vp-grip {');
    const end = block('.vp-grip--end {');

    for (const rule of [left, end]) {
      expect(rule).toContain('calc(50% - var(--vp-w) * var(--zoom, 1) / 2');
      expect(rule).toContain('var(--zoom');
      expect(rule).not.toContain('getBoundingClientRect');
    }
  });
});
