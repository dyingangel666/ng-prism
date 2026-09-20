import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Every template in the package that uses the native Popover API.
 *
 * jsdom 26 does not implement the API at all — `element.showPopover` is
 * undefined — so the behaviour cannot be exercised here. What can be checked
 * is the contract that makes the platform mechanism work in the first place:
 * a `popovertarget` naming an id that exists and carries the `popover`
 * attribute. The realistic regression is a renamed id or a dropped attribute
 * during a refactor, and both fail this test loudly while the button silently
 * does nothing in a browser.
 *
 * The canvas toolbar legitimately targets `prism-template`, declared in the
 * sibling `prism-template-popover.component.ts` — a cross-file reference, not
 * a bug. So id resolution is checked against the union of every file listed
 * here, while the per-file assertion (and the id-uniqueness check) stays
 * scoped to where a rename or a duplicate would actually happen.
 */
const TEMPLATES = [
  'component-head/prism-head-info.component.ts',
  'component-head/prism-head-gauge.component.ts',
  'canvas/prism-canvas-toolbar.component.ts',
  'canvas/prism-template-popover.component.ts',
];

function read(relative: string): string {
  return readFileSync(join(__dirname, relative), 'utf-8');
}

function popoverTargets(src: string): string[] {
  return [...src.matchAll(/popovertarget="([^"]+)"/g)].map((m) => m[1]);
}

function popoverIds(src: string): Set<string> {
  const ids = new Set<string>();
  for (const tag of src.matchAll(/<[a-z][^>]*>/gi)) {
    const text = tag[0];
    if (!/\spopover(\s|=|>)/.test(text)) continue;
    const id = /\sid="([^"]+)"/.exec(text)?.[1];
    if (id) ids.add(id);
  }
  return ids;
}

const declaredByFile = new Map(
  TEMPLATES.map((relative) => [relative, popoverIds(read(relative))])
);
const declaredUnion = new Set(
  [...declaredByFile.values()].flatMap((ids) => [...ids])
);

describe('popover wiring', () => {
  it.each(TEMPLATES)(
    '%s targets only popovers declared somewhere in the package',
    (relative) => {
      const src = read(relative);
      const targets = popoverTargets(src);
      expect(targets.length).toBeGreaterThan(0);
      for (const target of targets) {
        expect(declaredUnion).toContain(target);
      }
    }
  );

  it('gives every popover a unique id across the package', () => {
    const seen = new Map<string, string>();
    for (const [relative, ids] of declaredByFile) {
      for (const id of ids) {
        expect(seen.has(id)).toBe(false);
        seen.set(id, relative);
      }
    }
  });
});
