# Reactive Manifest & HMR Support for ng-prism

**Date:** 2026-04-16
**Status:** Approved

## Problem

Changes to `@Showcase` metadata (e.g., variant inputs, titles, descriptions) in a consumer library are detected by ng-prism's watcher and written to `prism-manifest.ts`, but the running styleguide UI does not reflect the changes. Users must restart the dev server or hard-refresh the browser to see updates.

**Root cause:** `PRISM_MANIFEST` is an `InjectionToken<RuntimeManifest>` with a `useValue` provider. The value is frozen at app bootstrap. Angular's HMR re-imports the generated `prism-manifest.ts` module, but does not re-run `bootstrapApplication`, so the injected value in existing services remains the old reference.

## Solution

Make the manifest reactive by:

1. Wrapping the injected `PRISM_MANIFEST` value in a `signal` inside `PrismManifestService`
2. Exposing an `updateManifest(newManifest)` method on the service
3. Providing an `enablePrismHmr(appRef, newManifest)` helper that users wire into their `import.meta.hot.accept` callback
4. Preserving UI state (selection, variant, control values) across manifest updates

The public API remains backward-compatible. HMR is pure opt-in.

## Data Flow

```
File change in consumer library
    ↓
ng-prism watcher detects change
    ↓
runPrismPipeline writes new prism-manifest.ts
    ↓
Angular dev server HMR re-imports prism-manifest.ts
    ↓
import.meta.hot.accept callback in user's main.ts fires
    ↓
enablePrismHmr(appRef, mod.PRISM_RUNTIME_MANIFEST)
    ↓
PrismManifestService.updateManifest(newManifest)
    ↓
_manifest signal updates → computed chain re-fires
    ↓
Navigation re-links activeItem by className/id
    ↓
Renderer reconciles component (preserves variant + valid inputs)
    ↓
UI reflects new metadata
```

## API Changes

### Token (unchanged)

```typescript
export const PRISM_MANIFEST = new InjectionToken<RuntimeManifest>('PRISM_MANIFEST');
```

The token stays a plain-value injection for backward compatibility.

### PrismManifestService

```typescript
@Injectable({ providedIn: 'root' })
export class PrismManifestService {
  private readonly _manifest = signal<RuntimeManifest>(inject(PRISM_MANIFEST));

  /** Readonly signal of the current manifest. Updates on HMR. */
  readonly manifest = this._manifest.asReadonly();

  readonly components = computed(() => this._manifest().components);
  readonly pages = computed(() => this._manifest().pages ?? []);
  readonly categories = computed(() => { /* existing body, reads _manifest() */ });
  readonly groupedByCategory = computed(() => { /* existing body */ });

  /** Replace the current manifest. Used by HMR to propagate new values. */
  updateManifest(manifest: RuntimeManifest): void {
    this._manifest.set(manifest);
  }
}
```

All existing computeds remain in place. Their consumers (e.g., `PrismSearchService`) work unchanged because they already read signals.

### HMR Helper

```typescript
// packages/ng-prism/src/app/hmr.ts
import type { ApplicationRef } from '@angular/core';
import type { RuntimeManifest } from '../plugin/plugin.types.js';
import { PrismManifestService } from './services/prism-manifest.service.js';

export function enablePrismHmr(appRef: ApplicationRef, newManifest: RuntimeManifest): void {
  const service = appRef.injector.get(PrismManifestService);
  service.updateManifest(newManifest);
}
```

Exported from `packages/ng-prism/src/app/index.ts` and the public package entry.

### User Setup (main.ts)

```typescript
import { bootstrapApplication } from '@angular/platform-browser';
import { providePrism, enablePrismHmr } from 'ng-prism';
import { PRISM_RUNTIME_MANIFEST } from './prism-manifest';
import { AppComponent } from './app.component';
import config from '../ng-prism.config';

const appRef = await bootstrapApplication(AppComponent, {
  providers: [providePrism(PRISM_RUNTIME_MANIFEST, config)]
});

if (import.meta.hot) {
  import.meta.hot.accept('./prism-manifest', (mod) => {
    if (mod) {
      enablePrismHmr(appRef, mod.PRISM_RUNTIME_MANIFEST);
    }
  });
}
```

## State Preservation

| State | Service | Strategy |
|---|---|---|
| Active component/page selection | `PrismNavigationService.activeItem` | Re-link by `className` / page id |
| Active variant index | `PrismRendererService.activeVariantIndex` | Clamp to new variants range |
| Control-Panel input values | `PrismRendererService.inputValues` | Preserve keys whose input still exists |
| Active panel tab | `PrismPanelService` | Automatic (separate signal) |
| Search query | `PrismSearchService.query` | Automatic (separate signal) |
| A11y perspective | `A11yPerspectiveService` | Automatic (separate signal) |

### Navigation Re-Linking

`PrismNavigationService` gains a constructor `effect` that watches `manifestService.manifest()`:

```typescript
constructor() {
  effect(() => {
    const manifest = this.manifestService.manifest();
    const current = untracked(() => this.activeItem());
    if (!current) return;

    if (current.kind === 'component') {
      const updated = manifest.components.find(
        c => c.meta.className === current.data.meta.className
      );
      if (updated && updated !== current.data) {
        this.activeItem.set({ kind: 'component', data: updated });
      } else if (!updated) {
        untracked(() => this.selectFirst());
      }
    } else {
      const updated = manifest.pages?.find(p => p.id === current.data.id);
      if (updated && updated !== current.data) {
        this.activeItem.set({ kind: 'page', data: updated });
      } else if (!updated) {
        untracked(() => this.selectFirst());
      }
    }
  });
}
```

### Renderer Reconciliation

`PrismRendererService` gains a `reconcileForComponent(comp)` method that preserves state when the className is unchanged:

```typescript
private _lastClassName: string | null = null;

reconcileForComponent(comp: RuntimeComponent): void {
  const prev = this._lastClassName;
  this._lastClassName = comp.meta.className;

  if (prev !== comp.meta.className) {
    this.resetForComponent(comp);
    return;
  }

  const maxIndex = Math.max(0, (comp.meta.showcaseConfig.variants?.length ?? 1) - 1);
  const preservedIndex = Math.min(this.activeVariantIndex(), maxIndex);
  this.activeVariantIndex.set(preservedIndex);

  const validKeys = new Set(comp.meta.inputs.map(i => i.name));
  const currentValues = this.inputValues();
  const preserved: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(currentValues)) {
    if (validKeys.has(key) || key === '__prismContent__') {
      preserved[key] = value;
    }
  }

  const variant = comp.meta.showcaseConfig.variants?.[preservedIndex];
  const variantInputs = variant?.inputs ?? {};
  this.inputValues.set({ ...variantInputs, ...preserved });
}
```

`PrismRendererComponent` replaces its `resetForComponent` call with `reconcileForComponent`. `resetForComponent` stays for explicit full resets (e.g., variant change via `selectVariant`).

## Edge Cases

1. **Renamed/removed component** — `findByClassName` returns nothing → fallback to `selectFirst()`
2. **Variants removed** — `Math.min(index, maxIndex)` clamps safely
3. **Input removed** — `validKeys.has(key)` is false → value dropped
4. **Input added** — merged from variant inputs during reconcile
5. **Input type changed** — old value preserved, user re-sets via Controls UI (pragmatic)
6. **Empty manifest** — `selectFirst()` sets `activeItem` to `null`
7. **Multiple rapid HMR events** — signal updates are idempotent, last wins
8. **Production build** — `import.meta.hot` is falsy, dead-code eliminated

## Testing Strategy

| Test | File | Focus |
|---|---|---|
| `updateManifest` updates the signal | `prism-manifest.service.spec.ts` | Signal update + computeds re-fire |
| `manifest` readonly signal exposes current value | `prism-manifest.service.spec.ts` | Initial + updated values |
| `components`/`pages`/`categories`/`groupedByCategory` react to updates | `prism-manifest.service.spec.ts` | Full computed chain |
| Navigation re-links component by className | `prism-navigation.service.spec.ts` | Same className, new ref |
| Navigation falls back when active component removed | `prism-navigation.service.spec.ts` | selectFirst path |
| Navigation re-links page by id | `prism-navigation.service.spec.ts` | Page handling |
| Renderer preserves variant index on same-className update | `prism-renderer.service.spec.ts` | `reconcileForComponent` |
| Renderer clamps variant index when variants shrink | `prism-renderer.service.spec.ts` | Index safety |
| Renderer preserves valid input values | `prism-renderer.service.spec.ts` | Key filtering |
| Renderer discards removed inputs | `prism-renderer.service.spec.ts` | Cleanup |
| Renderer merges variant defaults for new inputs | `prism-renderer.service.spec.ts` | Input additions |
| Renderer full-resets on different className | `prism-renderer.service.spec.ts` | Existing behavior preserved |
| `enablePrismHmr` calls `updateManifest` | `hmr.spec.ts` | Helper integration |

Manual verification scenarios documented in `docs/`:

- Start serve, change variant label in library → UI updates without reload
- Add new variant to existing component → sidebar unchanged, new variant visible in renderer
- Remove selected component from library → sidebar updates, UI falls back to first component
- Change input default value → control panel reflects new default for that variant

## Backward Compatibility

- `providePrism(manifest, config?, optok, tions?)` signature unchanged
- `PRISM_MANIFEST` token unchanged
- All existing `PrismManifestService` methods and computeds preserved
- Users without HMR setup: no behavior change

New additions only:

- `PrismManifestService.manifest` (readonly signal)
- `PrismManifestService.updateManifest(manifest)` (method)
- `PrismRendererService.reconcileForComponent(comp)` (method)
- `enablePrismHmr(appRef, manifest)` (exported helper)

## File Structure

Files to modify:

- `packages/ng-prism/src/app/services/prism-manifest.service.ts` — wrap in signal, add `updateManifest`, `manifest` readonly
- `packages/ng-prism/src/app/services/prism-navigation.service.ts` — add re-linking effect
- `packages/ng-prism/src/app/services/prism-renderer.service.ts` — add `reconcileForComponent`
- `packages/ng-prism/src/app/renderer/prism-renderer.component.ts` — call `reconcileForComponent` instead of `resetForComponent`
- `packages/ng-prism/src/app/index.ts` — export `enablePrismHmr`
- `packages/ng-prism/src/index.ts` — re-export `enablePrismHmr` from public API

Files to create:

- `packages/ng-prism/src/app/hmr.ts` — `enablePrismHmr` helper
- `packages/ng-prism/src/app/hmr.spec.ts` — helper tests

Test files to extend:

- `packages/ng-prism/src/app/services/prism-manifest.service.spec.ts`
- `packages/ng-prism/src/app/services/prism-navigation.service.spec.ts`
- `packages/ng-prism/src/app/services/prism-renderer.service.spec.ts`
