# Canvas State

The canvas (`PrismRendererComponent`) is governed by two cooperating services with distinct responsibilities.

## `PrismCanvasService`

Holds the user's globally persisted canvas preferences:

- `bg` — global default canvas background (any `CanvasBg`: `dots | plain | light | dark | checker | transparent`)
- `zoom`, `guides`, `rulers` — set from the floating canvas rail; guides and rulers are toggle buttons on the rail itself, zoom is a chooser in the rail's tools menu
- `viewportWidth` — `number | null`; the width `.demo-wrap` is constrained to, or `null` for unconstrained. Toggled from the rail, set from the **Width** chooser in the tools menu, and dragged from the grips at either edge of the constrained area.

State is persisted to `localStorage` under the key `ng-prism-canvas`. This is the source of truth for the user's preferred working environment across sessions.

## `PrismVariantBgService`

Computes the actually-applied canvas background by resolving a fallback chain:

```
effective = override  ??  variant.bg  ??  component.bg  ??  canvas.bg()
```

- `recommended` — computed from the active component and variant (`Variant.bg` wins over `ShowcaseConfig.bg`)
- `override` — read-only view of a transient signal; set when the user picks a background from the tools menu's **Canvas** group while a recommendation is active
- `effective` — the final `CanvasBg` value bound to the `data-bg` attribute of `.prism-canvas-stage`
- `isDeviating` — computed boolean; true when the override is non-null AND differs from the current recommendation

The override auto-clears whenever the active variant or component changes, so navigating back to a variant always shows its recommendation again.

### Why a separate service?

`PrismCanvasService` owns durable user preferences; `PrismVariantBgService` owns the transient, computed effective state. Keeping them separate preserves the user's global default when they temporarily deviate within a single variant.

## Viewport Width

`viewportWidth` narrows `.demo-wrap` so a layout can be checked at a given width without resizing
the browser. The state is a single nullable number rather than a device list: the question the tool
answers is _where does this break_, not _how does it look on a particular phone_. Presets (320, 390,
480, 640, 768, 1024) are named values of that number, and a drag rests on one when it comes within
8px. A drag is clamped to between 240 and 1600, regardless of preset.

### Container queries respond; media queries do not

A width constraint narrows a box. It does not change what `@media (max-width: …)` sees — that reads
the real browser viewport, and a component using media queries stays in its desktop layout however
narrow the box gets. What does respond is `@container`: `.demo-wrap` carries
`container-type: inline-size` while constrained, so a component written against container queries
reflows exactly as it would in production.

Emulating media queries would mean rendering the component in an iframe, which would take
`plugin-box-model` and every other overlay its target — overlays render as Angular components inside
`.demo-wrap`. The constraint is deliberately the cheaper half of that trade.

### Not in the URL

Like `zoom`, `guides` and `rulers`, the viewport width is a `localStorage` preference and not a URL
parameter. `PrismUrlStateService` carries navigation only — which component, page, variant, view and
panel you are looking at — not how the canvas is set up.

### Capture mode

Capture mode never restores a persisted width, so a run always starts unconstrained and no viewport
from an earlier session can leak into a baseline. The grips and the dimension line sit inside the
renderer's `@if (!capture.active())` block, alongside the crosshair, the rulers and the background
pill. Capture mode also never _writes_ the width back to storage — `PrismCanvasService.save()` is a
no-op while capture is active — so a capture run cannot corrupt the user's stored preference either.

## UI Affordances

- **Tools menu — recommendation marker** — the recommended background's button in the **Canvas** group carries a tinted border (driven by `recommended()`), rather than a separate glyph. Title attribute: `Recommended background for this variant`. Passive, always visible while a recommendation is active.
- **Canvas pill** — `Recommended: <bg> [Reset]` appears in the top-left of the canvas only when `isDeviating()` is true (actionable; the button clears the override and returns to the recommendation).
- **Tools menu — active state** — the active background button binds to `effective()` and carries the filled `is-on` state. Clicks write to the override when a recommendation exists; otherwise they update the persisted global default (backward-compatible behavior for components without `bg`). The recommended and active buttons can be the same one.
- **Dimension line** — the constrained width, centred at the top of the stage in `--prism-measure`. It is the third resident of the overlay band (pill left, dimension centre, rail right) and reads the same `--prism-canvas-overlay-top` as the others, so enabling rulers moves all three together.
- **Edge grips** — one at each edge of the constrained area, running on `prismResizer` with `scale` `-2 / zoom` and `2 / zoom`. `.demo-wrap` is centred and scaled by the canvas zoom, so an edge moving by `d` changes the width by `2d / zoom`, which keeps the grip under the cursor at any zoom level. Both grips are keyboard-reachable, step the width by 10px, and expose `aria-valuenow`, `aria-valuemin` and `aria-valuemax` for accessibility.
- **Rail width readout** — a second line under the zoom percentage on the floating toolrail, shown only while the viewport constraint is on. It renders the active width with a `px` suffix (`390px`), since a bare number directly under a `100%` line would read ambiguously.
