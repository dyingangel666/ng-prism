# ADR 007: The canvas tools leave the layout

**Status:** Accepted
**Date:** 2026-09-20
**Release:** `@ng-prism/core@22.2.0`

## Context

Before this change, the canvas sat under 303 px of fixed chrome split across five bands (header, component head, variant ribbon, canvas toolbar, addon panel tab bar) — the toolbar band alone was 47 px, for four buttons and a zoom readout that most sessions touch once and then never again. With the addon panel open, the canvas itself was left with 397 px. Every one of those bands charges its height on every visit, whether or not the controls in it are used that session.

The toolbar's contents were never one kind of thing. Guides and rulers are toggles flipped constantly while measuring a component against a design. Canvas background and zoom are choosers, set once per session and then left alone. The Angular-template button opens a whole secondary view. A single band with a fixed height charges the same layout cost for all three, regardless of how often each is actually touched.

## Decision

The canvas tools leave the layout band entirely and become a small rail floating over the canvas itself (`.prism-toolrail`, absolutely positioned inside `.prism-canvas-wrap`), plus native `popover` elements for anything that needs more room than a rail button.

The rail does not group its five entries by topic — it groups them **by kind**:

- **Toggles stay on the rail, at their own button.** Guides and rulers flip in place with one click each. A toggle moved behind a menu is the classic mistake: it turns a per-second action into a two-click one, for the two controls a session touches most.
- **Choosers move behind a menu.** Canvas background and zoom are set-once values, so they collapse into the `#prism-tools` popover (opened from the sliders button) without costing anything the rest of the time. The recommended background reads as a tinted border on its button rather than a separate star glyph, because the marker only ever has to answer one question — "which one is recommended" — where a border on the thing itself already lives.
- **The template button keeps its own place on the rail**, because it is a view, not a setting — opening `#prism-template` switches what you are looking at, the same category of action as the Playground/API switcher in the component head, not a preference to tuck away.

Both popovers use the platform [Popover API](https://developer.mozilla.org/en-US/docs/Web/API/Popover_API) (`popover` / `popovertarget` / `popovertargetaction`) rather than component state: the browser owns focus trapping, light-dismiss, `Escape`-to-close and top-layer stacking, so none of it has to be built or maintained here.

## Consequences

**Positive:**

- **Zero layout cost.** The rail is `position: absolute`, so removing or resizing it never reflows anything else in the shell — the 47 px band is simply gone, not replaced by a smaller one.
- **No new signals, services, or click-outside listeners.** The two menus that used to need open/close state, an outside-click handler and an `Escape` listener now need none of the three — the platform supplies all of it. `PrismLayoutService` loses three members entirely: `templatePopoverVisible`, `toggleTemplatePopover()` and `closeTemplatePopover()`.
- **One consistent marker vocabulary.** The recommended-background marker changed from a bespoke gold star to the same tinted-border idiom already used elsewhere for "this one is different," rather than adding a second way to say the same thing.

**Negative / accepted trade-offs:**

- **The rail can overlap a very wide component's right edge.** It floats at a fixed inset from `.prism-canvas-wrap`'s corner regardless of what is rendered underneath it, so a full-bleed or edge-to-edge component can end up with the rail sitting on top of its own right edge. Accepted rather than solved: computing an exclusion zone from the rendered component's box would reintroduce exactly the layout coupling this change removes, for a case that a handful of variants hit.
- **The interaction cannot be unit-tested.** jsdom (26, as used by this repo's Jest setup) does not implement the Popover API at all — `element.showPopover` is `undefined` — so opening, closing, light-dismiss and focus behaviour cannot be exercised in a test run. What can be checked, and is, is the structural contract that makes the platform mechanism work in the first place: every `popovertarget` in the package names an id that exists somewhere in the package and carries the `popover` attribute, and every declared id is unique. `packages/ng-prism/src/app/popover-wiring.spec.ts` asserts exactly that — not the behaviour, but the wiring a renamed id or a dropped attribute would silently break while looking, to a human, exactly the same.

## Related

- [Migration to v22 — Breaking changes in 22.2.0](../guide/migration-v22.md#breaking-changes-in-2220)
- [Theming — Marks, Measurement and Stage Tokens](../guide/theming.md#marks-measurement-and-stage-tokens)
