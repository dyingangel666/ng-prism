# Security Policy

## Reporting a Vulnerability

Please report security issues privately via GitHub's **[Report a
vulnerability](https://github.com/dyingangel666/ng-prism/security/advisories/new)**
form (Security tab → "Report a vulnerability"). This delivers the report
directly to the maintainers through GitHub's private security advisory channel.

Do **not** open public GitHub issues for suspected vulnerabilities.

## Threat Model

`@ng-prism/core` is a **developer tool** — an Angular-native styleguide /
showcase application, conceptually similar to Storybook. Understanding which
inputs ng-prism treats as trusted is essential when reviewing security alerts
against the library.

### Trusted inputs (developer-authored, build-time)

The following data is sourced from the consuming library's own source code,
processed at build time by the TypeScript scanner, and embedded into the
runtime manifest:

- `@Showcase` decorator metadata, including:
  - `variants[].inputs` — input values for a variant
  - `variants[].content` — HTML snippets projected into the rendered component
  - `providers`, `meta`, `canvasLayout`, etc.
- `NgPrismConfig` (from `ng-prism.config.ts`) — theme, plugins, custom pages,
  thresholds, …
- `ComponentPage` and `CustomPage` definitions registered via
  `providePrism(..., { componentPages, ... })`.

ng-prism treats all of the above as **trusted code authored by the library
developer**. They are not, and cannot become, end-user input at runtime.

### Untrusted inputs (end-user, runtime)

Only the following runtime inputs are considered untrusted, and ng-prism never
routes them into HTML rendering:

- URL state (`?component=…&variant=…&panel=…`) — interpreted as identifiers,
  used to look up entries in the trusted manifest. Never rendered as HTML.
- Control panel edits — typed values applied via `componentRef.setInput(name,
value)`. Bound through Angular's normal input pipeline, not interpolated into
  HTML.

There is no network fetch, no form, and no message-channel that injects content
into the rendered demo at runtime.

## Note on `innerHTML` usage

`packages/ng-prism/src/app/renderer/prism-renderer.component.ts` uses
`element.innerHTML = …` inside `parseContentToNodes` and `htmlToNodes` to
convert variant content into projectable DOM nodes. Static analysis tools
(e.g. Socket.dev) flag this pattern as a potential XSS sink.

In the threat model described above this is **safe by design**:

- The HTML string originates exclusively from `variant.content` in a
  developer-authored `@Showcase` decorator.
- Variant content is intended to contain Angular component and directive
  selectors (e.g. `<my-button>…</my-button>`), so HTML sanitization would
  defeat the feature's purpose.
- There is no code path through which an external actor can influence
  `PrismRendererService.activeContent`.

### Consumer responsibility

Library authors who use `@ng-prism/core` MUST NOT pipe untrusted, end-user
input into `@Showcase` variant content, into `NgPrismConfig`, or into the
runtime manifest. ng-prism is intended to render content the developer
wrote — not content received from end users at runtime.

If you have a use case that requires rendering untrusted HTML through
ng-prism, please open an issue first so we can discuss a sanitized rendering
path.
