# Figma Plugin

`@ng-prism/plugin-figma` brings your Figma designs into ng-prism with **two complementary panels**:

- **Figma Embed** — live, interactive iframe of the design
- **Design Diff** — pixel-by-pixel comparison between your rendered component and the Figma node (side-by-side, overlay, diff-only)

## Install

```bash
npm install @ng-prism/plugin-figma
```

The Design Diff feature additionally needs `html2canvas` and `pixelmatch` (declared as **optional** peer dependencies):

```bash
npm install html2canvas pixelmatch
```

You only need these if you actually use the Design Diff panel. The Embed panel works without them.

## Configuration

```typescript
// ng-prism.config.ts
import { defineConfig } from '@ng-prism/core/config';
import { figmaPlugin } from '@ng-prism/plugin-figma';

export default defineConfig({
  plugins: [
    figmaPlugin({
      // Optional. Only needed for the Design Diff panel.
      accessToken: process.env['FIGMA_TOKEN'],
    }),
  ],
});
```

### Options

| Option        | Type     | Required for     | Description                                                                 |
|---------------|----------|------------------|-----------------------------------------------------------------------------|
| `accessToken` | `string` | Design Diff only | Personal access token used to fetch node images via the Figma REST API.    |

### Getting a Figma access token

1. Open Figma → **Settings** → **Security** → **Personal access tokens**.
2. Create a new token. Grant it the **File content (read-only)** scope — that's all the plugin needs.
3. Pass it to `figmaPlugin({ accessToken })`.

> **Never commit a Figma access token to a public repository.** Read it from an environment variable (or your CI secret store) and inject it at build time. The token only needs to be available in the local dev/build environment — ng-prism does not ship it to the runtime bundle.

If `accessToken` is omitted, the Embed panel still works; the Design Diff panel will show an "Access Token fehlt" hint when triggered.

## Linking components to Figma nodes

The plugin reads Figma URLs from `meta.figma` on the showcase config or on individual variants. The URL must contain a `node-id` query parameter — Figma adds it automatically when you copy the link to a selected frame.

### Component-level URL

Applies to all variants — useful for the Embed panel when you want one design view per component:

```typescript
@Showcase({
  title: 'Button',
  meta: {
    figma: 'https://www.figma.com/design/abc123/My-Design?node-id=1-1',
  },
  variants: [
    { name: 'Primary', inputs: { variant: 'primary' } },
    { name: 'Danger',  inputs: { variant: 'danger' } },
  ],
})
```

### Variant-level URLs

Link each variant to its own Figma node. **Required for the Design Diff panel** — diffing operates on the active variant, so each variant needs its own design reference:

```typescript
@Showcase({
  title: 'Button',
  variants: [
    {
      name: 'Primary',
      inputs: { variant: 'primary' },
      meta: { figma: 'https://www.figma.com/design/abc123/My-Design?node-id=1-1' },
    },
    {
      name: 'Danger',
      inputs: { variant: 'danger' },
      meta: { figma: 'https://www.figma.com/design/abc123/My-Design?node-id=1-2' },
    },
  ],
})
```

When the active variant has a `meta.figma` URL, it takes precedence over the component-level URL. When there is no variant-level URL, the component-level URL is used. When neither is set, both Figma panels stay hidden.

### Object form

`meta.figma` also accepts an object — useful if you want to override the parsed node id explicitly:

```typescript
meta: {
  figma: {
    url: 'https://www.figma.com/design/abc123/My-Design?node-id=1-1',
    nodeId: '1:1', // optional — overrides the node-id extracted from the URL
  },
},
```

## Panel: Figma Embed

The Embed panel uses the public Figma Embed endpoint (`https://www.figma.com/embed?embed_host=ng-prism&url=...`). **No access token required** for public files. For private files, the user must be logged into Figma in their browser.

The embedded viewer is fully interactive — navigate nodes, zoom, inspect properties without leaving ng-prism.

The panel is visible whenever the component or any of its variants has a `meta.figma` URL.

## Panel: Design Diff

The Design Diff panel renders the component into a canvas (via `html2canvas`), fetches the corresponding Figma node as a PNG (via the Figma REST API), and computes a pixel-by-pixel diff (via `pixelmatch`).

The panel is visible whenever **any variant** has a `meta.figma` URL — the diff always targets the currently active variant.

### Workflow

1. Open the **Design Diff** panel.
2. Click **▶ Design Diff ausführen** to run the comparison.
3. Review the result in one of three modes.

### View modes

| Mode             | What you see                                                                 |
|------------------|------------------------------------------------------------------------------|
| **Side-by-side** | Component screenshot and Figma export rendered next to each other.          |
| **Overlay**      | Figma export layered on top of the component, with an opacity slider (0–100). Great for catching small alignment drifts. |
| **Diff**         | Just the pixelmatch output — red pixels where component and design diverge.  |

### Stats

The toolbar shows:

- **Similarity %** — `(totalPixels − diffPixels) / totalPixels * 100`
- **Diff pixel count** — raw number of pixels that differ beyond the threshold

Click **↺ Erneut** in the toolbar to re-run after editing the component or refreshing the Figma source.

### How the diff works

1. The component is captured with `html2canvas` at the size it currently renders.
2. The Figma node is fetched at **2× scale** via `GET /v1/images/{fileKey}?ids={nodeId}&format=png&scale=2` and scaled to match the component dimensions.
3. `pixelmatch` runs with `threshold: 0.1` and anti-aliasing detection disabled, producing the diff buffer.
4. All three artefacts (component, Figma, diff) are stored as data URLs in the panel state — no further network calls during mode switching.

### Error states

| Status              | What it means                                                                |
|---------------------|------------------------------------------------------------------------------|
| `Access Token fehlt`| `figmaPlugin({ accessToken })` is not configured.                            |
| `Kein Figma-Node …` | The active variant has no `meta.figma` URL.                                  |
| `Figma API Fehler`  | The Figma REST API rejected the request. Common causes: invalid token, missing file scope, file/node not accessible to the token's owner. |

## Lazy loading

Both panel components (`FigmaPanelComponent`, `FigmaDesignDiffPanelComponent`) are loaded via `loadComponent`. The plugin factory itself runs in Node.js (during the build) **and** in the browser, so we avoid eager imports of `@angular/platform-browser`, `html2canvas`, and `pixelmatch` — they would crash the Node-side evaluation. The heavy diff dependencies are only pulled in the moment the user clicks **Design Diff ausführen**.
