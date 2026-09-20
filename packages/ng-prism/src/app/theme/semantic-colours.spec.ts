import { PRISM_DARK_THEME, PRISM_LIGHT_THEME } from './prism-default-theme.js';

/**
 * The semantic colours have to be legible, and warning has to be tellable from
 * error at a glance.
 *
 * Both failed in the light theme and nobody noticed until it was on screen.
 * `--prism-warn` sat at 3.19:1 on white — under WCAG AA — and warning and error
 * were only ΔL* 12 apart where the working dark pair is 18. At the sizes these
 * appear in (an 11px gauge chip, a 10px badge, a 5px dot) lightness carries far
 * more of the distinction than hue, so a pair that differs mostly in hue reads
 * as one colour.
 *
 * Numbers rather than adjectives, because "looks different enough" is what
 * shipped the bug. A colour-blind reader is the case this really serves: for
 * deuteranopia the hue difference between amber and red largely disappears and
 * the lightness gap is all that is left.
 */

type Rgb = [number, number, number];

const rgb = (hex: string): Rgb => {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => Number.parseInt(h.slice(i, i + 2), 16)) as Rgb;
};

const toLinear = (channel: number): number => {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

const luminance = (hex: string): number => {
  const [r, g, b] = rgb(hex).map(toLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/** WCAG 2.x contrast ratio, 1–21. */
const contrast = (a: string, b: string): number => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

/** CIELAB, D65. */
const lab = (hex: string): [number, number, number] => {
  const [r, g, b] = rgb(hex).map(toLinear);
  const x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
  const y = r * 0.2126 + g * 0.7152 + b * 0.0722;
  const z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const [fx, fy, fz] = [f(x), f(y), f(z)];
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
};

const deltaE = (a: string, b: string): number =>
  Math.hypot(...lab(a).map((v, i) => v - lab(b)[i]));

const lightnessGap = (a: string, b: string): number =>
  Math.abs(lab(a)[0] - lab(b)[0]);

const THEMES = [
  ['light', PRISM_LIGHT_THEME],
  ['dark', PRISM_DARK_THEME],
] as const;

/** Pairs that must never be mistaken for one another. */
const CONFUSABLE = [
  ['--prism-warn', '--prism-danger'],
  ['--prism-mark-attention', '--prism-mark-critical'],
] as const;

const SEMANTIC = [
  '--prism-success',
  '--prism-warn',
  '--prism-danger',
  '--prism-mark-attention',
  '--prism-mark-critical',
] as const;

describe('semantic colours', () => {
  it.each(THEMES)(
    '%s theme meets WCAG AA against its own background',
    (_name, theme) => {
      // Reported as a map so a failure names every offending token and its
      // actual ratio, rather than stopping at the first one.
      const failing = Object.fromEntries(
        SEMANTIC.map((token) => [
          token,
          Number(contrast(theme[token], theme['--prism-bg']).toFixed(2)),
        ]).filter(([, ratio]) => (ratio as number) < 4.5)
      );
      expect(failing).toEqual({});
    }
  );

  it.each(
    THEMES.flatMap(([name, theme]) =>
      CONFUSABLE.map(
        ([a, b]) => [`${name}: ${a} vs ${b}`, theme, a, b] as const
      )
    )
  )('%s stays distinguishable', (_label, theme, a, b) => {
    // Matched to the dark pair that works in practice: ΔE 55, ΔL* 18. The
    // floors sit just under it so a deliberate tweak has room, and a drift
    // back to "two dark warm colours" does not.
    expect(deltaE(theme[a], theme[b])).toBeGreaterThanOrEqual(45);
    expect(lightnessGap(theme[a], theme[b])).toBeGreaterThanOrEqual(14);
  });
});
