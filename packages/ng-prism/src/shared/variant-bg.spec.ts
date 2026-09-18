import type { CanvasBg } from './canvas-bg.type.js';
import {
  declaredVariantBg,
  DEFAULT_VARIANT_BG,
  resolveVariantBg,
} from './variant-bg.js';

/**
 * A variant as `@Showcase` actually declares one.
 *
 * Built through a function rather than written inline. `VariantBgSource`
 * describes only the field this module reads — deliberately, so that nothing
 * here has to import `ShowcaseConfig` — and TypeScript's excess property check
 * rejects a `name` written straight into an argument literal, even though a
 * real `Variant` always has one and the same object passes fine through a
 * variable. Keeping the name is worth the helper: it is what makes "variant A"
 * and "variant B" legible in the assertions below.
 */
function variant(name: string, bg?: CanvasBg) {
  return { name, bg };
}

describe('declaredVariantBg', () => {
  it('returns null when neither level declares a bg', () => {
    expect(declaredVariantBg({ variants: [variant('A')] }, 0)).toBeNull();
  });

  it('returns the component bg when the variant declares none', () => {
    expect(declaredVariantBg({ bg: 'dark', variants: [variant('A')] }, 0)).toBe(
      'dark'
    );
  });

  it('lets the variant bg win over the component bg', () => {
    expect(
      declaredVariantBg({ bg: 'dark', variants: [variant('A', 'light')] }, 0)
    ).toBe('light');
  });

  it('resolves per index, not per component', () => {
    const config = {
      bg: 'dark' as const,
      variants: [variant('A', 'light'), variant('B')],
    };
    expect(declaredVariantBg(config, 0)).toBe('light');
    expect(declaredVariantBg(config, 1)).toBe('dark');
  });

  it('falls back to the component bg for an out-of-range index', () => {
    // The renderer clamps an unknown `?variant=` to index 0, so an index with
    // no variant behind it must still answer with the component's declaration
    // rather than pretending nothing was declared.
    expect(declaredVariantBg({ bg: 'dark', variants: [] }, 7)).toBe('dark');
  });

  it('handles a config with no variants at all', () => {
    expect(declaredVariantBg({ bg: 'checker' }, 0)).toBe('checker');
    expect(declaredVariantBg({}, 0)).toBeNull();
  });
});

describe('resolveVariantBg', () => {
  it('falls back to the default when nothing is declared', () => {
    expect(resolveVariantBg({}, 0)).toBe(DEFAULT_VARIANT_BG);
    expect(resolveVariantBg({}, 0)).toBe('transparent');
  });

  it('returns the declared bg when there is one', () => {
    expect(resolveVariantBg({ bg: 'dark' }, 0)).toBe('dark');
    expect(
      resolveVariantBg({ bg: 'dark', variants: [variant('A', 'plain')] }, 0)
    ).toBe('plain');
  });
});
