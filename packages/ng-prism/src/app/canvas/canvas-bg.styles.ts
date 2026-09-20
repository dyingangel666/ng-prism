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
  [data-bg="light"] {
    background-color: var(--prism-void-light, #f7f5fc);
    background-image: none;
  }
  [data-bg="dark"] {
    background-color: var(--prism-void-dark, #07050f);
    background-image: none;
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
