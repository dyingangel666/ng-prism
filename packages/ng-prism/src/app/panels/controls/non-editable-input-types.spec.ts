import type { InputMeta } from '../../../plugin/plugin.types.js';
import { isNonEditableInputType } from './non-editable-input-types.js';

function meta(rawType: string | undefined): InputMeta {
  return { name: 'x', type: 'unknown', required: false, rawType };
}

describe('isNonEditableInputType', () => {
  it('flags TemplateRef inputs', () => {
    expect(isNonEditableInputType(meta('TemplateRef<any>'))).toBe(true);
    expect(isNonEditableInputType(meta('TemplateRef<MyContext>'))).toBe(true);
  });

  it('flags TemplateRef in unions (e.g. `TemplateRef | undefined`)', () => {
    expect(isNonEditableInputType(meta('TemplateRef<any> | undefined'))).toBe(
      true
    );
    expect(isNonEditableInputType(meta('TemplateRef<any> | null'))).toBe(true);
  });

  it('flags ElementRef and ViewContainerRef', () => {
    expect(isNonEditableInputType(meta('ElementRef'))).toBe(true);
    expect(isNonEditableInputType(meta('ViewContainerRef'))).toBe(true);
  });

  it('does not flag unrelated object types', () => {
    expect(isNonEditableInputType(meta('MyConfig'))).toBe(false);
    expect(isNonEditableInputType(meta('Record<string, unknown>'))).toBe(false);
    expect(isNonEditableInputType(meta('string | number'))).toBe(false);
  });

  it('does not match substrings (e.g. `MyTemplateRefWrapper`)', () => {
    expect(isNonEditableInputType(meta('MyTemplateRefWrapper'))).toBe(false);
  });

  it('returns false when rawType is missing', () => {
    expect(isNonEditableInputType(meta(undefined))).toBe(false);
  });
});
