/**
 * What each `CanvasBg` value paints, shared by the Playground stage
 * (`prism-renderer`) and the Overview cells (`prism-overview-cell`).
 *
 * Must be the last entry of a component's `styles` array. After encapsulation
 * these attribute selectors have the same specificity as the `.some-stage`
 * class rule they override, so source order decides.
 *
 * The consuming element supplies its own `background-color`; only `light` and
 * `dark` override it. Capture mode is unaffected: `CAPTURE_STYLES` is a global
 * stylesheet using `!important`.
 */
export const CANVAS_BG_STYLES = `
  [data-bg="dots"] {
    background-image: radial-gradient(circle, var(--prism-dot) 1px, transparent 1px);
    background-size: 20px 20px;
  }

  [data-bg="plain"] {
    background-image: none;
  }

  /* Flat, not dotted. "light" and "dark" name the surface a component was
     designed against, and their colour is absolute rather than a theme token,
     which makes them the values to declare for a screenshot baseline. Use
     "dots" for the grid. */
  /* These two also re-point --prism-measure. Other overlays use theme colours
     on theme surfaces, but these grounds ignore the theme: "light" stays
     near-white in the dark theme and "dark" stays near-black in the light one.
     The dark theme's blue reaches only 1.8:1 on the light ground, so the
     measurement colour has to follow the ground, not the theme.

     Literal values because this file is theme-independent, like the two
     grounds below. Keep them in step with --prism-measure in
     prism-default-theme.ts; semantic-colours.spec.ts fails if they drift. */
  [data-bg="light"] {
    background-color: var(--prism-void-light, #f7f5fc);
    background-image: none;
    --prism-measure: #004d8a;
  }
  [data-bg="dark"] {
    background-color: var(--prism-void-dark, #07050f);
    background-image: none;
    --prism-measure: #41bcff;
  }

  /* "transparent" shares the checkerboard. In the app the checkerboard is
     already the UI's sign for "no surface", and a see-through stage would only
     show the shell behind it. Only CAPTURE_STYLES tells the two apart. */
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
