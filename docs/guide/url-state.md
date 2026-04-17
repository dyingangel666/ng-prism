# URL State Sync

ng-prism synchronizes the active component, page, variant, and view to the browser URL. This enables deep-linking, sharing, and reliable browser back/forward navigation.

## URL Parameters

| Parameter | Example | Description |
|-----------|---------|-------------|
| `component` | `?component=ButtonComponent` | Active component class name |
| `page` | `?page=Button%20Patterns` | Active page title (URL-encoded) |
| `variant` | `?variant=1` | Active variant index (0-based) |
| `view` | `?view=docs` | Active view tab (e.g. `docs`, `a11y`) |

Example URL:

```
http://localhost:4200?component=ButtonComponent&variant=2&view=docs
```

## Deep-Linking

Share a URL pointing directly to a specific component and variant. Anyone opening the link lands on exactly the same state.

```
http://localhost:4200?component=AlertComponent&variant=1
```

## State Preservation on Reload

URL state is read on page load before the first navigation. If `?component=ButtonComponent` is present, ng-prism selects that component on startup rather than defaulting to the first item in the manifest.

## Browser Back/Forward

Each navigation (selecting a component, changing variant, switching view) pushes a new browser history entry. The browser back and forward buttons move through the navigation history as expected.

## Opting Out

Disable URL state sync in your config:

```typescript
export default defineConfig({
  urlState: false,
});
```

When disabled, the URL never changes and no state is read from it on load.

## How It Works

`PrismUrlStateService` reads the URL on startup via `window.location.search` and sets the initial navigation state. It then subscribes to navigation signal changes and calls `history.pushState()` to keep the URL in sync.

The service is initialized automatically by `PrismShellComponent`. If you use a custom shell component (`appComponent`), call `PrismUrlStateService.init()` manually during bootstrap.

```typescript
@Component({ ... })
export class MyShellComponent {
  constructor() {
    inject(PrismUrlStateService).init();
  }
}
```
