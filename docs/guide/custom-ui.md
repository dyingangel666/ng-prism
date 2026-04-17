# Custom UI Sections

ng-prism lets you replace individual UI regions with your own Angular components, or go fully headless and provide an entirely custom shell.

## Replaceable Slots

Configure replacements in `prism.config.ts` under the `ui` key:

```typescript
import { defineConfig } from '@ng-prism/core';
import { MyHeaderComponent } from './ui/my-header.component.js';

export default defineConfig({
  ui: {
    header: MyHeaderComponent,
  },
});
```

All slots accept Angular standalone components. The slot component receives no inputs from ng-prism — use injected services for any data you need.

| Slot | Key | Description |
|------|-----|-------------|
| Top header bar | `ui.header` | Replace the logo, title, and toolbar |
| Left sidebar | `ui.sidebar` | Replace the navigation tree entirely |
| Component title area | `ui.componentHeader` | Replace the header above the canvas |
| Canvas + renderer area | `ui.renderer` | Replace the entire renderer region |
| Controls panel | `ui.controlsPanel` | Replace the built-in controls panel |
| Events panel | `ui.eventsPanel` | Replace the built-in events panel |
| Footer | `ui.footer` | Add a footer below the addon panels |

## Example: Custom Header

```typescript
// projects/my-lib-prism/src/ui/my-header.component.ts
import { Component, inject } from '@angular/core';
import { PrismSearchService } from '@ng-prism/core';

@Component({
  selector: 'app-my-header',
  standalone: true,
  template: `
    <header class="my-header">
      <img src="assets/logo.svg" alt="My Library" />
      <input
        type="search"
        placeholder="Search components…"
        (input)="search.search($any($event.target).value)"
      />
    </header>
  `,
  styles: [`
    .my-header {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0 1.5rem;
      height: var(--prism-header-height);
      background: var(--prism-bg-surface);
      border-bottom: 1px solid var(--prism-border);
    }
  `],
})
export class MyHeaderComponent {
  readonly search = inject(PrismSearchService);
}
```

Register it:

```typescript
export default defineConfig({
  ui: { header: MyHeaderComponent },
});
```

## Example: Custom Sidebar

Inject `PrismNavigationService` to read the category tree and handle selection:

```typescript
import { Component, inject } from '@angular/core';
import { PrismNavigationService, PrismManifestService } from '@ng-prism/core';

@Component({
  selector: 'app-my-sidebar',
  standalone: true,
  template: `
    @for (entry of nav.categoryTree() | keyvalue; track entry.key) {
      <h4>{{ entry.key }}</h4>
      @for (item of entry.value; track item.data) {
        <button (click)="selectItem(item)">
          {{ itemLabel(item) }}
        </button>
      }
    }
  `,
})
export class MySidebarComponent {
  readonly nav = inject(PrismNavigationService);

  selectItem(item: any) {
    if (item.kind === 'component') this.nav.select(item.data);
    else this.nav.selectPage(item.data);
  }

  itemLabel(item: any): string {
    return item.kind === 'component'
      ? item.data.meta.showcaseConfig.title
      : item.data.title;
  }
}
```

## Headless Mode

Set `headless: true` to strip all built-in chrome (header, sidebar, toolbar, panels). Only the component canvas is rendered. Useful for embedding the renderer in a larger custom app.

```typescript
export default defineConfig({
  headless: true,
});
```

## Full Shell Replacement — `appComponent`

Replace the entire application shell with your own Angular component. When `appComponent` is set, ng-prism renders it instead of `PrismShellComponent` while still providing all services.

```typescript
export default defineConfig({
  appComponent: MyCustomShellComponent,
});
```

Your shell component can use any ng-prism service via `inject()`. You are responsible for rendering a canvas area and wiring up navigation.
