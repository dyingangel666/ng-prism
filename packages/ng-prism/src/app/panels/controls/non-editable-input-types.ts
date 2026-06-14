import type { InputMeta } from '../../../plugin/plugin.types.js';

/**
 * Angular framework reference types that aren't meaningfully editable via
 * a JSON textarea (they wrap live framework objects, not data). When a
 * showcased component declares an input of one of these types, the controls
 * panel renders a "Not editable" placeholder instead of routing it through
 * the JsonControl — which would otherwise crash on `undefined`/non-serializable
 * defaults and presents a misleading editor to the developer anyway.
 */
const NON_EDITABLE_TYPE_NAMES = [
  'TemplateRef',
  'ElementRef',
  'ViewContainerRef',
] as const;

const NON_EDITABLE_TYPE_PATTERN = new RegExp(
  `\\b(?:${NON_EDITABLE_TYPE_NAMES.join('|')})\\b`
);

export function isNonEditableInputType(input: InputMeta): boolean {
  const raw = input.rawType;
  if (!raw) return false;
  return NON_EDITABLE_TYPE_PATTERN.test(raw);
}
