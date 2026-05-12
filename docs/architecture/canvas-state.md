# Canvas State

The canvas (`PrismRendererComponent`) is governed by two cooperating services with distinct responsibilities.

## `PrismCanvasService`

Holds the user's globally persisted canvas preferences:

- `bg` — global default canvas background (one of `dots | plain | light | dark | checker`)
- `zoom`, `guides`, `rulers` — toolbar toggles

State is persisted to `localStorage` under the key `ng-prism-canvas`. This is the source of truth for the user's preferred working environment across sessions.

## `PrismVariantBgService`

Computes the actually-applied canvas background by resolving a fallback chain:

```
effective = override  ??  variant.bg  ??  component.bg  ??  canvas.bg()
```

- `recommended` — computed from the active component and variant (`Variant.bg` wins over `ShowcaseConfig.bg`)
- `override` — read-only view of a transient signal; set when the user picks a background via the canvas toolbar while a recommendation is active
- `effective` — the final `CanvasBg` value bound to the `data-bg` attribute of `.prism-canvas-stage`
- `isDeviating` — computed boolean; true when the override is non-null AND differs from the current recommendation

The override auto-clears whenever the active variant or component changes, so navigating back to a variant always shows its recommendation again.

### Why a separate service?

`PrismCanvasService` owns durable user preferences; `PrismVariantBgService` owns the transient, computed effective state. Keeping them separate preserves the user's global default when they temporarily deviate within a single variant.

## UI Affordances

- **Variant ribbon** — a small color dot appears inside the variant tab when `bg` is declared on the variant (passive, always visible while the recommendation exists).
- **Canvas pill** — `Recommended: <bg> [Reset]` appears in the top-right of the canvas only when `isDeviating()` is true (actionable; the button clears the override and returns to the recommendation).
- **Canvas toolbar** — the active background button binds to `effective()`. Clicks write to the override when a recommendation exists; otherwise they update the persisted global default (backward-compatible behavior for components without `bg`).
