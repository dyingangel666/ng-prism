import {
  highlightJson,
  stringifyForJsonControl,
} from './json-control.component.js';

describe('highlightJson', () => {
  it('wraps JSON tokens in classed spans', () => {
    const html = highlightJson('{"label":"hi","n":2}');
    expect(html).toContain('<span class="jh-key">"label"</span>');
    expect(html).toContain('<span class="jh-string">"hi"</span>');
    expect(html).toContain('<span class="jh-number">2</span>');
  });

  it('returns an empty string for non-string input (defensive)', () => {
    // Regression: JsonControl crashed with `Cannot read properties of undefined
    // (reading 'replace')` when displayText computed to undefined because
    // JSON.stringify(undefined) returns undefined.
    expect(highlightJson(undefined as unknown as string)).toBe('');
    expect(highlightJson(null as unknown as string)).toBe('');
    expect(highlightJson(42 as unknown as string)).toBe('');
  });
});

describe('stringifyForJsonControl', () => {
  it('pretty-prints serializable values', () => {
    expect(stringifyForJsonControl({ a: 1 })).toBe('{\n  "a": 1\n}');
  });

  it('renders null as the literal "null" (matches JSON.stringify)', () => {
    expect(stringifyForJsonControl(null)).toBe('null');
  });

  it('renders undefined as the literal string "undefined"', () => {
    // JSON.stringify(undefined) === undefined (the value, not a string), which
    // upstream callers can't safely feed to a string renderer. We surface it
    // visibly instead so the controls panel doesn't crash.
    expect(stringifyForJsonControl(undefined)).toBe('undefined');
  });

  it('renders functions as the literal string "undefined" (JSON.stringify drops them)', () => {
    expect(stringifyForJsonControl(() => 0)).toBe('undefined');
  });
});
