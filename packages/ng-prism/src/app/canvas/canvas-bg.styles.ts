/**
 * What each `CanvasBg` value paints, shared by the Playground stage
 * (`prism-renderer`) and the Overview cells (`prism-overview-cell`).
 *
 * Append this as the **last** entry of a component's `styles` array. The
 * selectors are bare attribute selectors, so after Angular's encapsulation
 * rewrite they carry the same specificity as the `.some-stage` class rule they
 * have to override — source order is what decides, and only last place gets it
 * right.
 *
 * The consuming element supplies its own `background-color`; `light` and `dark`
 * override it, the rest leave it alone.
 *
 * Capture mode is unaffected by where these rules live: `CAPTURE_STYLES` in
 * `prism-capture.service.ts` is a global stylesheet using `!important`, which
 * beats any component-scoped rule regardless.
 */
export const CANVAS_BG_STYLES = `
  [data-bg="dots"] {
    background-image: radial-gradient(circle, var(--prism-dot) 1px, transparent 1px);
    background-size: 20px 20px;
  }

  [data-bg="plain"] {
    background-image: none;
  }

  /* Flat, not dotted. "light" and "dark" name a surface a component was
     designed against — and they are the two backgrounds whose colour is
     absolute rather than a theme token, which is what makes them the values
     to declare for a screenshot baseline. "dots" already exists for anyone
     who wants the grid. */
  /* These two also re-point --prism-measure, and that is not decoration.
     Every other canvas overlay is drawn in a theme colour over a theme
     surface, so the two move together. These two backgrounds are absolute:
     "light" stays near-white while the app runs the dark theme, and "dark"
     stays near-black while it runs the light one. The measurement colour
     picked for one theme is then sitting on the other theme's ground —
     measured, the dark theme's magenta reaches 2.85:1 on the light
     background, under the 4.5:1 its 9px readout needs. Pinning the colour to the
     ground rather than to the theme is what makes "always visible" true
     instead of true-in-the-common-case.

     --prism-measure-plate travels with it, and has to. It is the surface
     the measuring tool's value label paints itself on, to look like a gap
     in the measurement line rather than a badge laid over it. Left at its
     --prism-stage fallback it would be the *theme's* stage under a
     re-pointed foreground — the light theme's magenta on the dark theme's
     stage reads 3.71:1, and the dark theme's on white 3.08:1. Pinning the
     plate to the ground the same way the foreground is pinned restores
     4.54:1 and 6.57:1. A color-mix against the ground would do as well and
     is not used: this file already states both grounds literally, and one
     mechanism per decision beats two.

     Literal values because this file is theme-independent by construction —
     it is the one place that already hard-codes the two absolute grounds
     below, for the same reason. Keep them in step with --prism-measure in
     prism-default-theme.ts; semantic-colours.spec.ts fails if they drift. */
  [data-bg="light"] {
    background-color: var(--prism-void-light, #f7f5fc);
    background-image: none;
    --prism-measure: #ca00c1;
    --prism-measure-plate: var(--prism-void-light, #f7f5fc);
  }
  [data-bg="dark"] {
    background-color: var(--prism-void-dark, #07050f);
    background-image: none;
    --prism-measure: #f632ff;
    --prism-measure-plate: var(--prism-void-dark, #07050f);
  }

  /* "transparent" shares the checkerboard on purpose. The two say the same
     thing in the two media the canvas has: while browsing, the checkerboard
     is already the UI's word for "no surface here"; in a capture it becomes
     literal transparency. A stage that were really see-through in the app
     would just show the shell through the canvas, which means nothing. The
     split between the two lives entirely in CAPTURE_STYLES. */
  [data-bg="checker"],
  [data-bg="transparent"] {
    background-image:
      linear-gradient(45deg, var(--prism-border) 25%, transparent 25%),
      linear-gradient(-45deg, var(--prism-border) 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, var(--prism-border) 75%),
      linear-gradient(-45deg, transparent 75%, var(--prism-border) 75%);
    background-size: 16px 16px;
    background-position: 0 0, 0 8px, 8px -8px, -8px 0;
  }
`;
