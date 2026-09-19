import {
  PRISM_BASE_TOKENS,
  PRISM_DARK_THEME,
  PRISM_LIGHT_THEME,
} from './prism-default-theme.js';

describe('spacing scale', () => {
  it('declares seven steps', () => {
    const steps = [
      '--sp-1',
      '--sp-2',
      '--sp-3',
      '--sp-4',
      '--sp-5',
      '--sp-6',
      '--sp-7',
    ];
    for (const step of steps) {
      expect(PRISM_BASE_TOKENS[step]).toMatch(/^\d+px$/);
    }
  });

  it('is strictly ascending', () => {
    const px = (key: string) => Number.parseInt(PRISM_BASE_TOKENS[key], 10);
    const values = [1, 2, 3, 4, 5, 6, 7].map((n) => px(`--sp-${n}`));
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeGreaterThan(values[i - 1]);
    }
  });
});

describe('density and band heights', () => {
  it('defaults density to 1', () => {
    expect(PRISM_BASE_TOKENS['--density']).toBe('1');
  });

  /**
   * The point of the band tokens is that one CSS variable rescales the whole
   * chrome. A band declared as a bare pixel value silently opts out, and
   * nothing else would notice.
   */
  it.each(['--band-header', '--band-head', '--band-rail', '--band-tabs'])(
    '%s scales with density',
    (key) => {
      expect(PRISM_BASE_TOKENS[key]).toMatch(
        /^calc\(\d+px \* var\(--density\)\)$/
      );
    }
  );

  it('keeps --prism-header-height as an alias so published CSS keeps working', () => {
    expect(PRISM_BASE_TOKENS['--prism-header-height']).toBe(
      'var(--band-header)'
    );
  });
});

describe('mark roles', () => {
  const themes = [
    ['dark', PRISM_DARK_THEME],
    ['light', PRISM_LIGHT_THEME],
  ] as const;

  /**
   * The nominal state is invisible. That single rule is what turns the
   * navigation marks from a background texture back into a signal, so it is
   * asserted rather than left to a stylesheet.
   */
  it.each(themes)(
    '%s theme renders the nominal state invisible',
    (_n, theme) => {
      expect(theme['--prism-mark-nominal']).toBe('transparent');
    }
  );

  it.each(themes)('%s theme declares attention and critical', (_n, theme) => {
    expect(theme['--prism-mark-attention']).toMatch(/^#[0-9a-f]{6}$/);
    expect(theme['--prism-mark-critical']).toMatch(/^#[0-9a-f]{6}$/);
  });

  it.each(themes)(
    '%s theme builds the spectrum from theme colours',
    (_n, theme) => {
      expect(theme['--prism-spectrum']).toContain('var(--prism-accent)');
      expect(theme['--prism-spectrum']).toContain('var(--prism-primary)');
    }
  );
});
