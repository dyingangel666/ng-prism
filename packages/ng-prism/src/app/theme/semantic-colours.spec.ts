import { CANVAS_BG_STYLES } from '../canvas/canvas-bg.styles.js';
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

/**
 * Every leg of the traffic light has to be separable at a glance.
 *
 * The three mark roles are one scale, so all three legs are checked rather
 * than only the pair that originally collapsed.
 */
const CONFUSABLE = [
  ['--prism-warn', '--prism-danger'],
  ['--prism-mark-nominal', '--prism-mark-attention'],
  ['--prism-mark-nominal', '--prism-mark-critical'],
  ['--prism-mark-attention', '--prism-mark-critical'],
] as const;

/**
 * The legs where hue cannot be relied on, and lightness has to carry it.
 *
 * Amber and red are neighbours on the wheel: at 5–11px their hue difference is
 * marginal, and the light theme shipped a pair only ΔL* 3 apart that read as
 * one colour. Green against either is a wide hue gap (ΔE 65 and 100 in the
 * light theme) and needs no lightness floor.
 *
 * Applying the floor to all three legs was tried and is not reachable: a
 * three-step scale separated in lightness needs roughly L* 30/45/60, and L* 60
 * cannot hold 4.5:1 against white. Where lightness cannot separate them, the
 * glyph does — each mark carries its own icon, the status chip its own word,
 * and every readout row its own label.
 */
const WARM_PAIRS = [
  ['--prism-warn', '--prism-danger'],
  ['--prism-mark-attention', '--prism-mark-critical'],
] as const;

const SEMANTIC = [
  '--prism-success',
  '--prism-warn',
  '--prism-danger',
  '--prism-mark-nominal',
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
    // Matched to the dark pair that works in practice: ΔE 55. The floor sits
    // just under it so a deliberate tweak has room, and a drift back to "two
    // dark warm colours" does not.
    expect(deltaE(theme[a], theme[b])).toBeGreaterThanOrEqual(45);
  });

  it.each(
    THEMES.flatMap(([name, theme]) =>
      WARM_PAIRS.map(
        ([a, b]) => [`${name}: ${a} vs ${b}`, theme, a, b] as const
      )
    )
  )('%s separates in lightness, not only hue', (_label, theme, a, b) => {
    expect(lightnessGap(theme[a], theme[b])).toBeGreaterThanOrEqual(14);
  });

  /**
   * The measurement colour has to hold on the ground it is actually drawn on.
   *
   * `--prism-measure` carries the viewport grips, their guide lines and the
   * dimension line, and it is the one colour on the canvas whose ground is not
   * a theme surface. Two of the six canvas backgrounds are absolute: `light`
   * stays near-white while the app runs the dark theme, and `dark` stays
   * near-black while it runs the light one. So the theme's own value is only
   * ever half the story, and the half that was wrong — measured on the value
   * this replaced, the dark theme's cyan reached 1.81:1 on the light
   * background, which is an overlay you cannot see.
   *
   * canvas-bg.styles.ts answers that by re-pointing the token on those two
   * backgrounds. The literals there cannot import from this file, so this is
   * what stops the two copies drifting apart: each pair is checked against the
   * ground it is meant for, at the alpha the faintest load-bearing layer
   * actually uses.
   */
  describe('--prism-measure', () => {
    /** The two absolute canvas grounds, hard-coded in canvas-bg.styles.ts. */
    const ABSOLUTE_LIGHT = '#f7f5fc';
    const ABSOLUTE_DARK = '#07050f';

    /**
     * The override each absolute background declares, read out of the
     * stylesheet rather than copied here.
     *
     * Copying the literal would make this file agree with itself and with
     * nothing else: the pair could drift to any other colour that still passed
     * the contrast floors below and no test would notice. Reading the real
     * declaration is what turns these into a guard on canvas-bg.styles.ts.
     */
    const overrideFor = (bg: 'light' | 'dark'): string => {
      const rule = CANVAS_BG_STYLES.slice(
        CANVAS_BG_STYLES.indexOf(`[data-bg="${bg}"]`)
      );
      const found = /--prism-measure:\s*(#[0-9a-f]{6})/i.exec(
        rule.slice(0, rule.indexOf('}'))
      );
      if (!found)
        throw new Error(`[data-bg="${bg}"] declares no --prism-measure`);
      return found[1];
    };

    const ON_LIGHT_GROUND = overrideFor('light');
    const ON_DARK_GROUND = overrideFor('dark');

    /** `color-mix(... N%, transparent)` composited over an opaque ground. */
    const atAlpha = (fg: string, bg: string, alpha: number): string => {
      const [fr, fg_, fb] = rgb(fg);
      const [br, bg_, bb] = rgb(bg);
      const ch = (f: number, b: number) =>
        Math.round(f * alpha + b * (1 - alpha))
          .toString(16)
          .padStart(2, '0');
      return `#${ch(fr, br)}${ch(fg_, bg_)}${ch(fb, bb)}`;
    };

    it.each([
      ['dark theme, own stage', PRISM_DARK_THEME['--prism-measure'], '#16122b'],
      [
        'light theme, own stage',
        PRISM_LIGHT_THEME['--prism-measure'],
        '#ffffff',
      ],
      ['bg:dark, any theme', ON_DARK_GROUND, ABSOLUTE_DARK],
      ['bg:light, any theme', ON_LIGHT_GROUND, ABSOLUTE_LIGHT],
    ])('%s reads at 9px', (_label, colour, ground) => {
      // The readout is 9px monospace — AA's 4.5:1 for body text is the right
      // floor, not the 3:1 that large text or a bare UI edge would take.
      expect(contrast(colour, ground)).toBeGreaterThanOrEqual(4.5);
    });

    it.each([
      ['dark theme, own stage', PRISM_DARK_THEME['--prism-measure'], '#16122b'],
      [
        'light theme, own stage',
        PRISM_LIGHT_THEME['--prism-measure'],
        '#ffffff',
      ],
      ['bg:dark, any theme', ON_DARK_GROUND, ABSOLUTE_DARK],
      ['bg:light, any theme', ON_LIGHT_GROUND, ABSOLUTE_LIGHT],
    ])('%s keeps the end ticks visible', (_label, colour, ground) => {
      // The ticks are what make the dimension line read as a measurement of
      // the span rather than as a divider, and they run at 80% over the
      // ground. 3:1 is the non-text UI floor and the right one for a 1px mark.
      expect(
        contrast(atAlpha(colour, ground, 0.8), ground)
      ).toBeGreaterThanOrEqual(3);
    });

    it('declares the same colour on an absolute ground as the matching theme', () => {
      // The overrides exist to hold one theme's value steady when the other
      // theme's ground is on screen — so they ARE the theme values, and the
      // point of the override is only which one applies where. Drift between
      // the two copies would show up as a viewport overlay that changes colour
      // when a component declares a background, which reads as a rendering
      // fault rather than as the two-source bug it is.
      expect(ON_DARK_GROUND).toBe(PRISM_DARK_THEME['--prism-measure']);
      expect(ON_LIGHT_GROUND).toBe(PRISM_LIGHT_THEME['--prism-measure']);
    });

    it('stays tellable from the primary accent in both themes', () => {
      // Measurement is its own signal. If it drifts far enough toward the
      // brand violet, a grip starts reading as a primary control rather than
      // as chrome that happens to be draggable.
      for (const theme of [PRISM_DARK_THEME, PRISM_LIGHT_THEME]) {
        expect(
          deltaE(theme['--prism-measure'], theme['--prism-primary'])
        ).toBeGreaterThanOrEqual(30);
      }
    });
  });
});
