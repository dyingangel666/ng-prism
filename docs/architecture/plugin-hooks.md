# Plugin Hooks

Plugin hooks are the build-time extension points of ng-prism. They run inside the Angular builder (Node.js) as part of the pipeline between scanning and manifest writing.

## Hook Execution Order

For each pipeline run, hooks execute in this sequence:

```
For each component (in scan order):
  → plugin[0].onComponentScanned(component)
  → plugin[1].onComponentScanned(component)
  → ...

For each page (in config order):
  → plugin[0].onPageScanned(page)
  → plugin[1].onPageScanned(page)
  → ...

Once, with the full manifest:
  → plugin[0].onManifestReady(manifest)
  → plugin[1].onManifestReady(manifest)
  → ...
```

Plugins run in registration order within each phase. The output of one plugin is the input to the next — hooks chain.

## `onComponentScanned`

Called once per `@Showcase`-decorated component after all metadata has been extracted by the scanner.

```typescript
onComponentScanned(component: ScannedComponent): ScannedComponent | void | Promise<ScannedComponent | void>
```

**Mutation pattern** — mutate the object in place and return `void`, or return a new object. Returning `void` (or `undefined`) keeps the previous value.

```typescript
onComponentScanned(component) {
  component.meta = {
    ...component.meta,
    myPlugin: { extractedAt: Date.now() },
  };
  // no return → keeps mutated object
}
```

**Return new object:**

```typescript
onComponentScanned(component) {
  return {
    ...component,
    meta: { ...component.meta, extra: 'value' },
  };
}
```

**Chaining:** When plugin A and plugin B both implement `onComponentScanned`, the `ScannedComponent` passed to plugin B is the (possibly modified) output from plugin A.

**Typical uses:**
- Extract JSDoc from `component.filePath` using `ts.createSourceFile()` (JSDoc plugin)
- Fetch external metadata keyed on `component.className`
- Validate that required `meta` fields are present and warn if missing

## `onPageScanned`

Called once per `StyleguidePage` after all pages are collected (both `config.pages` entries and Component Pages).

```typescript
onPageScanned(page: StyleguidePage): StyleguidePage | void | Promise<StyleguidePage | void>
```

Same mutation/return pattern as `onComponentScanned`.

```typescript
onPageScanned(page) {
  if (page.type === 'custom' && page.data['markdown']) {
    page.data = {
      ...page.data,
      html: renderMarkdown(page.data['markdown'] as string),
    };
  }
}
```

## `onManifestReady`

Called once with the complete `PrismManifest` after all `onComponentScanned` and `onPageScanned` hooks have finished.

```typescript
onManifestReady(manifest: PrismManifest): PrismManifest | void | Promise<PrismManifest | void>
```

Use for cross-component transformations or manifest-level filtering.

```typescript
onManifestReady(manifest) {
  // Filter out components tagged 'internal'
  manifest.components = manifest.components.filter(
    (c) => !c.showcaseConfig.tags?.includes('internal'),
  );
}
```

Return a new manifest object for immutable transforms:

```typescript
onManifestReady(manifest) {
  return {
    ...manifest,
    components: manifest.components.map(addGlobalMeta),
  };
}
```

## Async Hooks

All three hooks accept `Promise` return values. The pipeline runner uses `await` for each hook:

```typescript
async onComponentScanned(component) {
  const result = await fetch(`https://api.example.com/meta/${component.className}`);
  const data = await result.json();
  component.meta = { ...component.meta, remote: data };
}
```

The pipeline is sequential — it does not parallelize hook calls within a phase. If a hook is slow, it blocks the full rebuild. Keep async hooks lightweight.

## Error Handling

If a hook throws, the error propagates out of `runPluginHooks()` and is caught by the builder, which logs it and marks the build as failed. The Angular dev server is not started if the pipeline fails.

## What Cannot Be Done in Hooks

Build-time hooks run in Node.js. The following are not available:

- Browser globals (`window`, `document`, `navigator`)
- Angular APIs that require the browser (`@angular/platform-browser`, CDK)
- Lazy-loaded Angular components

For browser-only functionality, use `panels` and `controls` runtime contributions instead — they are only loaded in the browser.
