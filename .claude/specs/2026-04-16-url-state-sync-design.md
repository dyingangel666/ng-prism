# URL State Sync for ng-prism

**Date:** 2026-04-16
**Status:** Approved

## Problem

When the ng-prism dev server does a full page reload (e.g. after Angular rebuilds for any code change), the active component selection, variant, and view tab all reset to defaults. The user loses their place and has to re-navigate.

Additionally, ng-prism has no shareable URLs. You cannot send a coworker a link to "the SguiTooltipDirective, Dark variant, API panel." There's no deep-linking.

## Solution

A `PrismUrlStateService` that keeps selected `component` (or `page`), `variant` index, and top-level `view` in the browser URL as query parameters. The service:

1. **On init:** reads URL, restores signals to match
2. **On signal change:** writes updated state to URL (history API)
3. **On popstate:** re-reads URL, restores signals (browser back/forward)

URL examples:

```
/?component=SguiButtonComponent&variant=2&view=api
/?page=ButtonPatterns
/                                             # default (first component)
```

History strategy:

- Component or page change → `pushState` (new history entry — back button navigates between components)
- Variant or view change → `replaceState` (no new history entry — minor state changes)

## Data Flow

```
User clicks sidebar entry
    ↓
PrismNavigationService.activeItem updates
    ↓ (effect in UrlStateService)
window.history.pushState(...) → URL updates

User clicks variant tab
    ↓
PrismRendererService.activeVariantIndex updates
    ↓ (effect)
window.history.replaceState(...) → URL updates (no new history entry)

User clicks browser Back
    ↓
popstate event
    ↓
UrlStateService re-reads URL → signals updated
    ↓
Components react via existing signal chain (nav, renderer, panel services)

User opens shared URL in new tab
    ↓
App bootstraps → Shell calls urlStateService.init()
    ↓
init() reads URL → signals set → UI reflects shared state
```

## API

### New Service

**File:** `packages/ng-prism/src/app/services/prism-url-state.service.ts`

```typescript
@Injectable({ providedIn: 'root' })
export class PrismUrlStateService {
  private readonly manifestService = inject(PrismManifestService);
  private readonly navigationService = inject(PrismNavigationService);
  private readonly rendererService = inject(PrismRendererService);
  private readonly panelService = inject(PrismPanelService);
  private readonly config = inject(PRISM_CONFIG);

  private suppressSync = false;

  /**
   * Wire URL state sync. Reads current URL, restores state, sets up
   * effects that keep URL in sync with signal changes, and listens for
   * popstate to handle browser back/forward. Respects config.urlState === false
   * to opt out.
   */
  init(): void {
    if (this.config.urlState === false) return;

    this.restoreFromUrl();

    effect(() => {
      const item = this.navigationService.activeItem();
      const variantIndex = this.rendererService.activeVariantIndex();
      const viewId = this.panelService.activeViewId();

      if (this.suppressSync) return;
      this.writeToUrl(item, variantIndex, viewId);
    });

    window.addEventListener('popstate', () => this.restoreFromUrl());
  }

  private restoreFromUrl(): void { /* ... see implementation below */ }
  private writeToUrl(item, variantIndex, viewId): void { /* ... */ }
}
```

### Config Extension

**File:** `packages/ng-prism/src/plugin/plugin.types.ts`

```typescript
export interface NgPrismConfig {
  // ... existing fields
  /** When false, disables URL state sync (default: true). */
  urlState?: boolean;
}
```

### Shell Wiring

**File:** `packages/ng-prism/src/app/shell/prism-shell.component.ts`

Inject `PrismUrlStateService` and call `init()` from the constructor after `selectFirst()`:

```typescript
constructor() {
  this.navigationService.selectFirst();
  this.urlStateService.init();  // NEW
  // ... existing effects unchanged
}
```

### Public API Export

**File:** `packages/ng-prism/src/app/index.ts`

```typescript
export { PrismUrlStateService } from './services/prism-url-state.service.js';
```

## URL Format

```
Query parameters:
  component   — className of active component (e.g. "SguiButtonComponent")
  page        — title of active custom/component page (mutually exclusive with component)
  variant     — numeric variant index, omitted when 0
  view        — active top-tab view id, omitted when "renderer"
```

Constants in the service:

```typescript
const PARAM_COMPONENT = 'component';
const PARAM_PAGE = 'page';
const PARAM_VARIANT = 'variant';
const PARAM_VIEW = 'view';
const DEFAULT_VIEW = 'renderer';
```

## Restore Implementation

```typescript
private restoreFromUrl(): void {
  const params = new URLSearchParams(window.location.search);
  const componentClassName = params.get(PARAM_COMPONENT);
  const pageTitle = params.get(PARAM_PAGE);
  const variantParam = params.get(PARAM_VARIANT);
  const viewId = params.get(PARAM_VIEW);

  this.suppressSync = true;
  try {
    if (componentClassName) {
      const comp = this.manifestService.components()
        .find((c) => c.meta.className === componentClassName);
      if (comp) {
        this.navigationService.select(comp);
        if (variantParam !== null) {
          const index = parseInt(variantParam, 10);
          const maxIndex = (comp.meta.showcaseConfig.variants?.length ?? 1) - 1;
          if (!Number.isNaN(index) && index >= 0 && index <= maxIndex) {
            this.rendererService.activeVariantIndex.set(index);
          }
        }
      }
    } else if (pageTitle) {
      const page = this.manifestService.pages()
        .find((p) => p.title === pageTitle);
      if (page) {
        this.navigationService.selectPage(page);
      }
    }

    if (viewId) {
      this.panelService.activeViewId.set(viewId);
    }
  } finally {
    this.suppressSync = false;
  }
}
```

## Write Implementation

```typescript
private writeToUrl(
  item: NavigationItem | null,
  variantIndex: number,
  viewId: string,
): void {
  const params = new URLSearchParams();

  if (item?.kind === 'component') {
    params.set(PARAM_COMPONENT, item.data.meta.className);
    if (variantIndex > 0) {
      params.set(PARAM_VARIANT, String(variantIndex));
    }
  } else if (item?.kind === 'page') {
    params.set(PARAM_PAGE, item.data.title);
  }

  if (viewId && viewId !== DEFAULT_VIEW) {
    params.set(PARAM_VIEW, viewId);
  }

  const queryString = params.toString();
  const newUrl = queryString
    ? `${window.location.pathname}?${queryString}`
    : window.location.pathname;

  if (newUrl === window.location.pathname + window.location.search) return;

  const currentParams = new URLSearchParams(window.location.search);
  const prevNavKey = currentParams.get(PARAM_COMPONENT) ?? currentParams.get(PARAM_PAGE);
  const newNavKey = params.get(PARAM_COMPONENT) ?? params.get(PARAM_PAGE);

  if (prevNavKey !== newNavKey) {
    window.history.pushState(null, '', newUrl);
  } else {
    window.history.replaceState(null, '', newUrl);
  }
}
```

## Edge Cases

1. **Component in URL but missing from manifest:** silently ignored; shell's `selectFirst()` already set a default. URL updates on next signal change.
2. **Both `component` and `page` in URL:** `component` wins (checked first). Only happens with hand-crafted URLs.
3. **`variant=5` but component has 3 variants:** ignored; variant stays at 0.
4. **`variant=abc` (not a number):** `parseInt` returns NaN → guarded, ignored.
5. **`view=unknownId`:** signal is set literally. Unknown view ids render empty — acceptable failure mode, no validation needed.
6. **Page renamed, URL has old title:** not found → shell's `selectFirst()` provides fallback.
7. **No config supplied:** `PRISM_CONFIG` factory returns `{}`; `this.config.urlState === false` is false, sync runs (opt-out only).
8. **Manifest replaced by HMR:** existing navigation re-link logic already handles this. URL content matches since className is stable.
9. **SSR / Node environment:** out of scope; ng-prism is browser-only. `window` always available.

## `suppressSync` Flag

When `restoreFromUrl()` writes signals, the sync effect would fire and write the URL back (potentially differently formatted). The flag short-circuits the effect during restore. `try/finally` ensures reset even on error.

## Timing

`init()` runs in `PrismShellComponent.constructor`. By that point:

- Manifest is already loaded (provided via `useValue`)
- All signals exist
- `selectFirst()` ran immediately before

Order in shell constructor:

```typescript
this.navigationService.selectFirst();  // Default if no URL state
this.urlStateService.init();           // Overrides from URL if valid
```

Valid URL → overrides default. Empty/invalid URL → default wins. No race condition.

## Testing Strategy

| Test | Focus |
|---|---|
| Init with empty URL does nothing | No-op on `?` (no params) |
| Init restores component by className | `?component=X` → `activeComponent.className === 'X'` |
| Init restores variant index | `?component=X&variant=2` → `activeVariantIndex === 2` |
| Init restores page by title | `?page=Y` → `activePage.title === 'Y'` |
| Init restores view id | `?view=api` → `activeViewId === 'api'` |
| Init ignores unknown component | `?component=Unknown` → no-op, no crash, defaults preserved |
| Init clamps out-of-range variant | `?variant=99` → stays at 0 |
| Init ignores NaN variant | `?variant=abc` → stays at 0 |
| Writes component to URL on select | After `select(comp)`, URL contains `?component=...` |
| Writes variant only if > 0 | Default variant 0 omitted from URL |
| Writes view only if != 'renderer' | Default view omitted from URL |
| pushState on component change | First component → second component → one `pushState` call |
| replaceState on variant change | Same component, new variant → `replaceState` |
| replaceState on view change | Same component, new view → `replaceState` |
| popstate re-reads URL | Dispatch popstate event → signals updated from URL |
| Disabled via config urlState=false | `init()` returns early, no effects registered |
| suppressSync prevents loop | `restoreFromUrl()` does not trigger `writeToUrl()` |

### Test Setup Notes

- Tests use `TestBed.configureTestingModule` so signal `effect()` has the required scheduler.
- `jest.spyOn(window.history, 'pushState')` and `'replaceState'` verify history calls.
- `window.history.replaceState({}, '', '/')` at test start resets URL.
- `TestBed.flushEffects()` after signal writes to process effects synchronously.

## File Structure

Files to create:

- `packages/ng-prism/src/app/services/prism-url-state.service.ts` — the service
- `packages/ng-prism/src/app/services/prism-url-state.service.spec.ts` — tests

Files to modify:

- `packages/ng-prism/src/plugin/plugin.types.ts` — add `urlState?: boolean` to `NgPrismConfig`
- `packages/ng-prism/src/app/shell/prism-shell.component.ts` — inject service, call `init()`
- `packages/ng-prism/src/app/index.ts` — export service

No changes to existing services, navigation/renderer/panel state, or runtime manifest.

## Non-Goals

- Storing bottom panel tab (Controls/Events/A11y) in URL — user opted out; changes too frequently to benefit
- Storing input control values in URL — runtime state, not navigational
- Storing search query in URL — UI state, not shareable intent
- Validating view ids against registered panels — YAGNI, silent fallback is acceptable
- Router integration — separate service is simpler and sufficient for 3 query params
