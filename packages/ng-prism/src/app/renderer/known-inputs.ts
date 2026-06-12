import type { RuntimeComponent } from '../../plugin/plugin.types.js';

/** Synthetic input the manifest generator emits on directive wrapper classes
 * to project per-variant `content` text into the host element. The directive
 * itself doesn't declare it, so it isn't in `meta.inputs` — code that
 * validates / filters inputs against that list must allow this key through.
 */
export const PRISM_CONTENT_INPUT = '__prismContent__';

export function buildKnownInputs(comp: RuntimeComponent): Set<string> {
  const known = new Set(comp.meta.inputs.map((i) => i.name));
  if (comp.meta.componentMeta.isDirective) {
    known.add(PRISM_CONTENT_INPUT);
  }
  return known;
}
