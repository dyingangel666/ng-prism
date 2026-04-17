# URL State Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sync active component/page, variant index, and view id to URL query params for deep-linking and state persistence across reloads.

**Architecture:** A new `PrismUrlStateService` reads/writes URL query params using the History API directly. Called from `PrismShellComponent.constructor` via `init()`. An internal `suppressSync` flag prevents feedback loops when restoring state triggers the sync effect.

**Tech Stack:** Angular 21 signals + effects, native `window.history` + `popstate`, Jest 30 + SWC.

---

### Task 1: Extend `NgPrismConfig` with `urlState` option

**Files:**
- Modify: `packages/ng-prism/src/plugin/plugin.types.ts`

- [ ] **Step 1: Add the optional `urlState` field**

In `packages/ng-prism/src/plugin/plugin.types.ts`, locate the `NgPrismConfig` interface (around line 97-115). Before the closing `}` of the interface, add:

```typescript
  /** When false, disables URL state sync (default: true). */
  urlState?: boolean;
```

The full interface becomes:

```typescript
export interface NgPrismConfig {
  plugins?: NgPrismPlugin[];
  pages?: StyleguidePage[];
  /** Providers added to the Prism app bootstrap — for library-wide services */
  appProviders?: Provider[];
  theme?: Record<string, string>;
  themeStylesheet?: string;
  ui?: {
    header?: Type<unknown>;
    sidebar?: Type<unknown>;
    componentHeader?: Type<unknown>;
    renderer?: Type<unknown>;
    controlsPanel?: Type<unknown>;
    eventsPanel?: Type<unknown>;
    footer?: Type<unknown>;
  };
  headless?: boolean;
  appComponent?: Type<unknown>;
  /** When false, disables URL state sync (default: true). */
  urlState?: boolean;
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/ng-prism/src/plugin/plugin.types.ts
git commit -m "feat(config): add urlState opt-out flag to NgPrismConfig"
```

---

### Task 2: Create `PrismUrlStateService` with failing tests

**Files:**
- Create: `packages/ng-prism/src/app/services/prism-url-state.service.ts`
- Create: `packages/ng-prism/src/app/services/prism-url-state.service.spec.ts`

- [ ] **Step 1: Create the spec file with failing tests**

Create `packages/ng-prism/src/app/services/prism-url-state.service.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { ApplicationRef } from '@angular/core';
import type { RuntimeComponent, RuntimeManifest, NgPrismConfig } from '../../plugin/plugin.types.js';
import { PRISM_CONFIG, PRISM_MANIFEST } from '../tokens/prism-tokens.js';
import { PrismManifestService } from './prism-manifest.service.js';
import { PrismNavigationService } from './prism-navigation.service.js';
import { PrismPanelService } from './prism-panel.service.js';
import { PrismRendererService } from './prism-renderer.service.js';
import { PrismUrlStateService } from './prism-url-state.service.js';

function createComponent(
  overrides: Partial<{ className: string; title: string; variants: { name: string }[] }> = {},
): RuntimeComponent {
  return {
    type: class {} as any,
    meta: {
      className: overrides.className ?? 'Comp',
      filePath: '/test.ts',
      showcaseConfig: {
        title: overrides.title ?? 'Default',
        variants: overrides.variants,
      },
      inputs: [],
      outputs: [],
      componentMeta: { selector: 'test', standalone: true, isDirective: false },
    },
  };
}

function setUrl(search: string): void {
  window.history.replaceState({}, '', `/${search}`);
}

function flush(): void {
  TestBed.inject(ApplicationRef).tick();
}

function setup(manifest: RuntimeManifest, config: NgPrismConfig = {}): {
  url: PrismUrlStateService;
  nav: PrismNavigationService;
  renderer: PrismRendererService;
  panel: PrismPanelService;
} {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      { provide: PRISM_MANIFEST, useValue: manifest },
      { provide: PRISM_CONFIG, useValue: config },
    ],
  });
  return {
    url: TestBed.inject(PrismUrlStateService),
    nav: TestBed.inject(PrismNavigationService),
    renderer: TestBed.inject(PrismRendererService),
    panel: TestBed.inject(PrismPanelService),
  };
}

describe('PrismUrlStateService', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/');
  });

  describe('init - restore from URL', () => {
    it('should do nothing when URL has no params', () => {
      const comp = createComponent({ className: 'Foo' });
      const { url, nav } = setup({ components: [comp] });

      url.init();

      expect(nav.activeItem()).toBeNull();
    });

    it('should restore component by className', () => {
      const comp = createComponent({ className: 'SguiButton' });
      setUrl('?component=SguiButton');
      const { url, nav } = setup({ components: [comp] });

      url.init();

      expect(nav.activeComponent()).toBe(comp);
    });

    it('should restore variant index', () => {
      const comp = createComponent({
        className: 'SguiButton',
        variants: [{ name: 'V1' }, { name: 'V2' }, { name: 'V3' }],
      });
      setUrl('?component=SguiButton&variant=2');
      const { url, renderer } = setup({ components: [comp] });

      url.init();

      expect(renderer.activeVariantIndex()).toBe(2);
    });

    it('should restore page by title', () => {
      const page = { type: 'component' as const, title: 'ButtonPatterns', category: 'Docs', component: class {} as any };
      setUrl('?page=ButtonPatterns');
      const { url, nav } = setup({ components: [], pages: [page] });

      url.init();

      expect(nav.activePage()).toBe(page);
    });

    it('should restore view id', () => {
      setUrl('?view=api');
      const { url, panel } = setup({ components: [] });

      url.init();

      expect(panel.activeViewId()).toBe('api');
    });

    it('should ignore unknown component className without crashing', () => {
      const comp = createComponent({ className: 'Real' });
      setUrl('?component=Unknown');
      const { url, nav } = setup({ components: [comp] });

      url.init();

      expect(nav.activeComponent()).toBeNull();
    });

    it('should ignore out-of-range variant index', () => {
      const comp = createComponent({
        className: 'SguiButton',
        variants: [{ name: 'V1' }],
      });
      setUrl('?component=SguiButton&variant=99');
      const { url, renderer } = setup({ components: [comp] });

      url.init();

      expect(renderer.activeVariantIndex()).toBe(0);
    });

    it('should ignore NaN variant value', () => {
      const comp = createComponent({
        className: 'SguiButton',
        variants: [{ name: 'V1' }, { name: 'V2' }],
      });
      setUrl('?component=SguiButton&variant=abc');
      const { url, renderer } = setup({ components: [comp] });

      url.init();

      expect(renderer.activeVariantIndex()).toBe(0);
    });
  });

  describe('init - write to URL', () => {
    it('should write component className to URL on select', () => {
      const comp = createComponent({ className: 'SguiButton' });
      const { url, nav } = setup({ components: [comp] });

      url.init();
      nav.select(comp);
      flush();

      expect(window.location.search).toBe('?component=SguiButton');
    });

    it('should write variant only when > 0', () => {
      const comp = createComponent({
        className: 'SguiButton',
        variants: [{ name: 'V1' }, { name: 'V2' }],
      });
      const { url, nav, renderer } = setup({ components: [comp] });

      url.init();
      nav.select(comp);
      flush();
      expect(window.location.search).toBe('?component=SguiButton');

      renderer.activeVariantIndex.set(1);
      flush();
      expect(window.location.search).toBe('?component=SguiButton&variant=1');

      renderer.activeVariantIndex.set(0);
      flush();
      expect(window.location.search).toBe('?component=SguiButton');
    });

    it('should write view only when != renderer', () => {
      const comp = createComponent({ className: 'SguiButton' });
      const { url, nav, panel } = setup({ components: [comp] });

      url.init();
      nav.select(comp);
      panel.activeViewId.set('api');
      flush();

      expect(window.location.search).toBe('?component=SguiButton&view=api');
    });

    it('should write page title instead of component', () => {
      const page = { type: 'component' as const, title: 'Patterns', category: 'Docs', component: class {} as any };
      const { url, nav } = setup({ components: [], pages: [page] });

      url.init();
      nav.selectPage(page);
      flush();

      expect(window.location.search).toBe('?page=Patterns');
    });
  });

  describe('history API behavior', () => {
    it('should use pushState when component changes', () => {
      const a = createComponent({ className: 'A' });
      const b = createComponent({ className: 'B' });
      const pushSpy = jest.spyOn(window.history, 'pushState');
      const { url, nav } = setup({ components: [a, b] });

      url.init();
      nav.select(a);
      flush();
      pushSpy.mockClear();

      nav.select(b);
      flush();

      expect(pushSpy).toHaveBeenCalledTimes(1);
    });

    it('should use replaceState when variant changes', () => {
      const comp = createComponent({
        className: 'A',
        variants: [{ name: 'V1' }, { name: 'V2' }],
      });
      const replaceSpy = jest.spyOn(window.history, 'replaceState');
      const { url, nav, renderer } = setup({ components: [comp] });

      url.init();
      nav.select(comp);
      flush();
      replaceSpy.mockClear();

      renderer.activeVariantIndex.set(1);
      flush();

      expect(replaceSpy).toHaveBeenCalledTimes(1);
    });

    it('should use replaceState when view changes', () => {
      const comp = createComponent({ className: 'A' });
      const replaceSpy = jest.spyOn(window.history, 'replaceState');
      const { url, nav, panel } = setup({ components: [comp] });

      url.init();
      nav.select(comp);
      flush();
      replaceSpy.mockClear();

      panel.activeViewId.set('api');
      flush();

      expect(replaceSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('popstate handling', () => {
    it('should re-read URL on popstate event', () => {
      const a = createComponent({ className: 'A' });
      const b = createComponent({ className: 'B' });
      const { url, nav } = setup({ components: [a, b] });

      url.init();
      nav.select(a);
      flush();

      setUrl('?component=B');
      window.dispatchEvent(new PopStateEvent('popstate'));

      expect(nav.activeComponent()).toBe(b);
    });
  });

  describe('opt-out via config', () => {
    it('should not register effect when config.urlState is false', () => {
      const comp = createComponent({ className: 'A' });
      const pushSpy = jest.spyOn(window.history, 'pushState');
      const { url, nav } = setup({ components: [comp] }, { urlState: false });

      url.init();
      nav.select(comp);
      flush();

      expect(pushSpy).not.toHaveBeenCalled();
      expect(window.location.search).toBe('');
    });

    it('should not restore from URL when config.urlState is false', () => {
      const comp = createComponent({ className: 'A' });
      setUrl('?component=A');
      const { url, nav } = setup({ components: [comp] }, { urlState: false });

      url.init();

      expect(nav.activeComponent()).toBeNull();
    });
  });

  describe('suppressSync', () => {
    it('should not re-write URL during restoreFromUrl', () => {
      const comp = createComponent({ className: 'A' });
      setUrl('?component=A');
      const pushSpy = jest.spyOn(window.history, 'pushState');
      const replaceSpy = jest.spyOn(window.history, 'replaceState');
      const { url } = setup({ components: [comp] });

      url.init();
      flush();

      expect(pushSpy).not.toHaveBeenCalled();
      expect(replaceSpy).not.toHaveBeenCalled();
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx nx test ng-prism -- --testPathPatterns=prism-url-state.service.spec`
Expected: FAIL — module `./prism-url-state.service.js` does not exist.

- [ ] **Step 3: Implement the service**

Create `packages/ng-prism/src/app/services/prism-url-state.service.ts`:

```typescript
import { effect, inject, Injectable } from '@angular/core';
import type { NavigationItem } from './navigation-item.types.js';
import { PRISM_CONFIG } from '../tokens/prism-tokens.js';
import { PrismManifestService } from './prism-manifest.service.js';
import { PrismNavigationService } from './prism-navigation.service.js';
import { PrismPanelService } from './prism-panel.service.js';
import { PrismRendererService } from './prism-renderer.service.js';

const PARAM_COMPONENT = 'component';
const PARAM_PAGE = 'page';
const PARAM_VARIANT = 'variant';
const PARAM_VIEW = 'view';
const DEFAULT_VIEW = 'renderer';

@Injectable({ providedIn: 'root' })
export class PrismUrlStateService {
  private readonly manifestService = inject(PrismManifestService);
  private readonly navigationService = inject(PrismNavigationService);
  private readonly rendererService = inject(PrismRendererService);
  private readonly panelService = inject(PrismPanelService);
  private readonly config = inject(PRISM_CONFIG);

  private suppressSync = false;

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
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx nx test ng-prism -- --testPathPatterns=prism-url-state.service.spec`
Expected: PASS — all tests green.

- [ ] **Step 5: Commit**

```bash
git add packages/ng-prism/src/app/services/prism-url-state.service.ts packages/ng-prism/src/app/services/prism-url-state.service.spec.ts
git commit -m "feat: add PrismUrlStateService for URL-based state sync"
```

---

### Task 3: Wire `PrismUrlStateService` into `PrismShellComponent`

**Files:**
- Modify: `packages/ng-prism/src/app/shell/prism-shell.component.ts`

- [ ] **Step 1: Add the import and inject statement**

In `packages/ng-prism/src/app/shell/prism-shell.component.ts`, add the import near the other service imports (after line 15 `PrismPageRendererComponent`):

```typescript
import { PrismUrlStateService } from '../services/prism-url-state.service.js';
```

Then in the `PrismShellComponent` class, find the existing injected services (look for `private readonly navigationService = inject(...)`, etc.). Add a new inject line for the URL service near them:

```typescript
private readonly urlStateService = inject(PrismUrlStateService);
```

- [ ] **Step 2: Call `init()` from constructor**

Update the constructor (around line 218) to call `urlStateService.init()` immediately after `selectFirst()`:

```typescript
constructor() {
  this.navigationService.selectFirst();
  this.urlStateService.init();

  effect(() => {
    this.navigationService.activeItem();
    this.panelService.activeViewId.set('renderer');
  });

  effect(() => {
    const item = this.navigationService.activeItem();
    const activeComp = this.navigationService.activeComponent();
    const activePage = this.navigationService.activePage();
    if (item !== null && activeComp === null && activePage === null) {
      untracked(() => this.navigationService.selectFirst());
    }
  });
}
```

**IMPORTANT:** Note the existing effect at lines 221-224 that resets `activeViewId` to `'renderer'` whenever `activeItem` changes. This would fight with URL-restored view state — the URL service restores view from URL, then this effect immediately resets it. Change this effect to only reset the view when the component navigation truly changed (new item selected by user), not on the initial URL restore.

Replace that effect with:

```typescript
    let lastItemKey: string | null = null;
    effect(() => {
      const item = this.navigationService.activeItem();
      const key = item
        ? (item.kind === 'component' ? item.data.meta.className : item.data.title)
        : null;
      if (lastItemKey !== null && lastItemKey !== key) {
        untracked(() => this.panelService.activeViewId.set('renderer'));
      }
      lastItemKey = key;
    });
```

This way, view only resets when the user navigates to a DIFFERENT component/page. On first run (URL restore populates activeItem), `lastItemKey` is null so the reset is skipped — the URL-restored view is preserved.

- [ ] **Step 3: Run the full test suite**

Run: `npx nx test ng-prism`
Expected: All tests pass, including new URL state tests.

- [ ] **Step 4: Commit**

```bash
git add packages/ng-prism/src/app/shell/prism-shell.component.ts
git commit -m "feat(shell): wire PrismUrlStateService and preserve URL-restored view"
```

---

### Task 4: Export `PrismUrlStateService` from public API

**Files:**
- Modify: `packages/ng-prism/src/app/index.ts`

- [ ] **Step 1: Add the export**

In `packages/ng-prism/src/app/index.ts`, find the "Services" section (where `PrismManifestService`, `PrismNavigationService` etc. are exported). Add a new export line after the last service export:

```typescript
export { PrismUrlStateService } from './services/prism-url-state.service.js';
```

- [ ] **Step 2: Verify build still succeeds**

Run: `npx nx build ng-prism`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add packages/ng-prism/src/app/index.ts
git commit -m "feat: expose PrismUrlStateService in public API"
```

---

### Task 5: Full verification

**Files:** None (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npx nx test ng-prism`
Expected: All tests pass. Count should be ≥ previous count plus ~17 new tests from Task 2.

- [ ] **Step 2: Run the build**

Run: `npx nx build ng-prism`
Expected: Build succeeds.

- [ ] **Step 3: Report summary**

Report:
- Total test count (previous + new)
- Build success
- Any warnings
