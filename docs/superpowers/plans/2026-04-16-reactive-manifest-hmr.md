# Reactive Manifest & HMR Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the ng-prism manifest reactive so that HMR-driven updates to `prism-manifest.ts` propagate to the running styleguide UI, preserving user state (selection, variant, control values) across updates.

**Architecture:** Wrap the injected `PRISM_MANIFEST` value in a signal inside `PrismManifestService`, expose `updateManifest()` for runtime replacement, add a re-linking effect in `PrismNavigationService` that restores selection by className/id, and introduce `reconcileForComponent()` in `PrismRendererService` that preserves variant index and valid input values when the className stays the same. Expose an `enablePrismHmr(appRef, manifest)` helper for user `main.ts` integration.

**Tech Stack:** Angular 21 signals (`signal`, `computed`, `effect`, `asReadonly`, `untracked`), Jest 30 + SWC for tests.

---

### Task 1: Make PrismManifestService reactive

**Files:**
- Modify: `packages/ng-prism/src/app/services/prism-manifest.service.ts`
- Modify: `packages/ng-prism/src/app/services/prism-manifest.service.spec.ts`

- [ ] **Step 1: Add failing tests for the new API**

Append to `packages/ng-prism/src/app/services/prism-manifest.service.spec.ts` inside the `describe('PrismManifestService')` block:

```typescript
  it('should expose manifest as a readonly signal', () => {
    const comps = [createComponent()];
    const service = setup({ components: comps });
    expect(service.manifest()).toEqual({ components: comps });
  });

  it('should update components when updateManifest is called', () => {
    const service = setup({ components: [createComponent({ className: 'Old' })] });
    const newComps = [createComponent({ className: 'New1' }), createComponent({ className: 'New2' })];

    service.updateManifest({ components: newComps });

    expect(service.components()).toEqual(newComps);
  });

  it('should update categories computed when updateManifest is called', () => {
    const service = setup({ components: [createComponent({ category: 'Forms' })] });
    expect(service.categories()).toEqual(['Forms']);

    service.updateManifest({
      components: [
        createComponent({ category: 'Layout', className: 'L1' }),
        createComponent({ category: 'Data', className: 'D1' }),
      ],
    });

    expect(service.categories()).toEqual(['Data', 'Layout']);
  });

  it('should update groupedByCategory computed when updateManifest is called', () => {
    const service = setup({ components: [createComponent({ category: 'A', className: 'A1' })] });

    const newComp = createComponent({ category: 'B', className: 'B1' });
    service.updateManifest({ components: [newComp] });

    const grouped = service.groupedByCategory();
    expect(grouped.get('B')).toEqual([newComp]);
    expect(grouped.has('A')).toBe(false);
  });

  it('should update pages when updateManifest is called', () => {
    const service = setup({ components: [] });
    expect(service.pages()).toEqual([]);

    service.updateManifest({
      components: [],
      pages: [{ id: 'intro', title: 'Intro', category: 'Docs', component: class {} as any }],
    });

    expect(service.pages()).toEqual([
      { id: 'intro', title: 'Intro', category: 'Docs', component: expect.any(Function) },
    ]);
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx nx test ng-prism -- --testPathPatterns=prism-manifest.service.spec`
Expected: FAIL — `service.manifest is not a function`, `service.updateManifest is not a function`.

- [ ] **Step 3: Rewrite `prism-manifest.service.ts` to use a signal**

Replace the entire file `packages/ng-prism/src/app/services/prism-manifest.service.ts`:

```typescript
import { computed, inject, Injectable, signal } from '@angular/core';
import type { RuntimeComponent, RuntimeManifest } from '../../plugin/plugin.types.js';
import type { StyleguidePage } from '../../plugin/page.types.js';
import { PRISM_MANIFEST } from '../tokens/prism-tokens.js';

@Injectable({ providedIn: 'root' })
export class PrismManifestService {
  private readonly _manifest = signal<RuntimeManifest>(inject(PRISM_MANIFEST));

  readonly manifest = this._manifest.asReadonly();

  readonly components = computed<RuntimeComponent[]>(() => this._manifest().components);

  readonly pages = computed<StyleguidePage[]>(() => this._manifest().pages ?? []);

  readonly categories = computed<string[]>(() => {
    const manifest = this._manifest();
    const orderMap = new Map<string, number>();
    for (const comp of manifest.components) {
      const cat = comp.meta.showcaseConfig.category ?? 'Uncategorized';
      const order = comp.meta.showcaseConfig.categoryOrder ?? Infinity;
      if (!orderMap.has(cat) || order < orderMap.get(cat)!) {
        orderMap.set(cat, order);
      }
    }
    for (const page of (manifest.pages ?? [])) {
      const cat = page.category ?? 'Uncategorized';
      if (!orderMap.has(cat)) {
        orderMap.set(cat, Infinity);
      }
    }
    return [...orderMap.keys()].sort((a, b) => {
      const orderA = orderMap.get(a)!;
      const orderB = orderMap.get(b)!;
      if (orderA !== orderB) return orderA - orderB;
      return a.localeCompare(b);
    });
  });

  readonly groupedByCategory = computed<Map<string, RuntimeComponent[]>>(() => {
    const manifest = this._manifest();
    const map = new Map<string, RuntimeComponent[]>();
    for (const comp of manifest.components) {
      const cat = comp.meta.showcaseConfig.category ?? 'Uncategorized';
      const list = map.get(cat) ?? [];
      list.push(comp);
      map.set(cat, list);
    }
    return map;
  });

  updateManifest(manifest: RuntimeManifest): void {
    this._manifest.set(manifest);
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx nx test ng-prism -- --testPathPatterns=prism-manifest.service.spec`
Expected: PASS — all tests green.

- [ ] **Step 5: Commit**

```bash
git add packages/ng-prism/src/app/services/prism-manifest.service.ts packages/ng-prism/src/app/services/prism-manifest.service.spec.ts
git commit -m "feat: make PrismManifestService reactive via signal-backed manifest"
```

---

### Task 2: Add navigation re-linking effect

**Files:**
- Modify: `packages/ng-prism/src/app/services/prism-navigation.service.ts`
- Modify: `packages/ng-prism/src/app/services/prism-navigation.service.spec.ts`

The navigation service currently does not react to manifest changes. After HMR, `activeItem` holds a stale `RuntimeComponent` reference. We add a constructor `effect` that, when the manifest changes, looks up the active component/page in the new manifest by `className` (for components) or `id` (for pages). If found with a different reference, it updates `activeItem`; if not found, it falls back to `selectFirst()`.

- [ ] **Step 1: Add failing tests for re-linking behavior**

Append to `packages/ng-prism/src/app/services/prism-navigation.service.spec.ts` inside the `describe('PrismNavigationService')` block:

```typescript
  it('should re-link activeComponent to new reference when manifest updates with same className', () => {
    const original = createComponent({ title: 'Button', className: 'Btn' });
    const service = setup({ components: [original] });
    service.select(original);

    const manifestService = TestBed.inject(PrismManifestService);
    const updated = createComponent({ title: 'Button NEW', className: 'Btn' });
    manifestService.updateManifest({ components: [updated] });

    expect(service.activeComponent()).toBe(updated);
    expect(service.activeComponent()).not.toBe(original);
  });

  it('should fall back to selectFirst when active component is removed from manifest', () => {
    const removed = createComponent({ className: 'Removed' });
    const survivor = createComponent({ className: 'Survivor' });
    const service = setup({ components: [removed, survivor] });
    service.select(removed);

    const manifestService = TestBed.inject(PrismManifestService);
    manifestService.updateManifest({ components: [survivor] });

    expect(service.activeComponent()).toBe(survivor);
  });

  it('should set activeItem to null when active component is removed and manifest is empty', () => {
    const comp = createComponent({ className: 'Only' });
    const service = setup({ components: [comp] });
    service.select(comp);

    const manifestService = TestBed.inject(PrismManifestService);
    manifestService.updateManifest({ components: [] });

    expect(service.activeComponent()).toBeNull();
  });

  it('should re-link activePage by id when manifest updates', () => {
    const page = { id: 'intro', title: 'Intro', category: 'Docs', component: class {} as any };
    const service = setup({ components: [], pages: [page] });
    service.selectPage(page);

    const manifestService = TestBed.inject(PrismManifestService);
    const updatedPage = { id: 'intro', title: 'Intro NEW', category: 'Docs', component: class {} as any };
    manifestService.updateManifest({ components: [], pages: [updatedPage] });

    expect(service.activePage()).toBe(updatedPage);
  });
```

The existing test setup uses `Injector.create` directly. For the new tests that call `TestBed.inject(PrismManifestService)`, we need to replace the setup helper with a TestBed-based one. Update the `setup` function in `prism-navigation.service.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';

function setup(manifest: RuntimeManifest): PrismNavigationService {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [{ provide: PRISM_MANIFEST, useValue: manifest }],
  });
  return TestBed.inject(PrismNavigationService);
}
```

Remove the old `setup` function and its unused imports (`Injector`, `runInInjectionContext`, manual service instantiations).

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx nx test ng-prism -- --testPathPatterns=prism-navigation.service.spec`
Expected: FAIL — re-linking tests fail because no effect exists.

- [ ] **Step 3: Add re-linking effect to PrismNavigationService**

Modify `packages/ng-prism/src/app/services/prism-navigation.service.ts`. Add the following imports and constructor body. The full file should look like:

```typescript
import { computed, effect, inject, Injectable, signal, untracked } from '@angular/core';
import type { RuntimeComponent } from '../../plugin/plugin.types.js';
import type { StyleguidePage } from '../../plugin/page.types.js';
import type { NavigationItem } from './navigation-item.types.js';
import { PrismManifestService } from './prism-manifest.service.js';
import { PrismSearchService } from './prism-search.service.js';

@Injectable({ providedIn: 'root' })
export class PrismNavigationService {
  private readonly searchService = inject(PrismSearchService);
  private readonly manifestService = inject(PrismManifestService);

  readonly activeItem = signal<NavigationItem | null>(null);

  readonly activeComponent = computed<RuntimeComponent | null>(() => {
    const item = this.activeItem();
    return item?.kind === 'component' ? item.data : null;
  });

  readonly activePage = computed<StyleguidePage | null>(() => {
    const item = this.activeItem();
    return item?.kind === 'page' ? item.data : null;
  });

  readonly categoryTree = computed<Map<string, NavigationItem[]>>(() => {
    const map = new Map<string, NavigationItem[]>();

    for (const comp of this.searchService.filteredComponents()) {
      const cat = comp.meta.showcaseConfig.category ?? 'Uncategorized';
      const list = map.get(cat) ?? [];
      list.push({ kind: 'component', data: comp });
      map.set(cat, list);
    }

    for (const page of this.searchService.filteredPages()) {
      const cat = page.category ?? 'Uncategorized';
      const list = map.get(cat) ?? [];
      list.push({ kind: 'page', data: page });
      map.set(cat, list);
    }

    for (const items of map.values()) {
      items.sort((a, b) => {
        const orderA = a.kind === 'component' ? (a.data.meta.showcaseConfig.componentOrder ?? Infinity) : Infinity;
        const orderB = b.kind === 'component' ? (b.data.meta.showcaseConfig.componentOrder ?? Infinity) : Infinity;
        if (orderA !== orderB) return orderA - orderB;
        const labelA = a.kind === 'component' ? a.data.meta.showcaseConfig.title : a.data.title;
        const labelB = b.kind === 'component' ? b.data.meta.showcaseConfig.title : b.data.title;
        return labelA.localeCompare(labelB);
      });
    }

    const sorted = [...map.entries()].sort(([catA, itemsA], [catB, itemsB]) => {
      const orderA = Math.min(...itemsA
        .filter((i): i is { kind: 'component'; data: RuntimeComponent } => i.kind === 'component')
        .map((i) => i.data.meta.showcaseConfig.categoryOrder ?? Infinity));
      const orderB = Math.min(...itemsB
        .filter((i): i is { kind: 'component'; data: RuntimeComponent } => i.kind === 'component')
        .map((i) => i.data.meta.showcaseConfig.categoryOrder ?? Infinity));
      if (orderA !== orderB) return orderA - orderB;
      return catA.localeCompare(catB);
    });

    return new Map(sorted);
  });

  constructor() {
    effect(() => {
      const manifest = this.manifestService.manifest();
      const current = untracked(() => this.activeItem());
      if (!current) return;

      if (current.kind === 'component') {
        const updated = manifest.components.find(
          (c) => c.meta.className === current.data.meta.className,
        );
        if (updated && updated !== current.data) {
          untracked(() => this.activeItem.set({ kind: 'component', data: updated }));
        } else if (!updated) {
          untracked(() => this.selectFirst());
        }
      } else {
        const updated = manifest.pages?.find((p) => p.id === current.data.id);
        if (updated && updated !== current.data) {
          untracked(() => this.activeItem.set({ kind: 'page', data: updated }));
        } else if (!updated) {
          untracked(() => this.selectFirst());
        }
      }
    });
  }

  select(comp: RuntimeComponent): void {
    this.activeItem.set({ kind: 'component', data: comp });
  }

  selectPage(page: StyleguidePage): void {
    this.activeItem.set({ kind: 'page', data: page });
  }

  selectFirst(): void {
    const comps = this.searchService.filteredComponents();
    if (comps.length > 0) {
      this.activeItem.set({ kind: 'component', data: comps[0] });
      return;
    }
    const pages = this.searchService.filteredPages();
    if (pages.length > 0) {
      this.activeItem.set({ kind: 'page', data: pages[0] });
      return;
    }
    this.activeItem.set(null);
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx nx test ng-prism -- --testPathPatterns=prism-navigation.service.spec`
Expected: PASS — all tests green (existing + new).

- [ ] **Step 5: Commit**

```bash
git add packages/ng-prism/src/app/services/prism-navigation.service.ts packages/ng-prism/src/app/services/prism-navigation.service.spec.ts
git commit -m "feat: re-link activeItem by className/id when manifest updates"
```

---

### Task 3: Add reconcileForComponent to PrismRendererService

**Files:**
- Modify: `packages/ng-prism/src/app/services/prism-renderer.service.ts`
- Modify: `packages/ng-prism/src/app/services/prism-renderer.service.spec.ts`

The renderer service currently resets everything when a new component is selected. For HMR, when the same component (by className) receives a new reference, we want to preserve the active variant index and existing control values. We add `reconcileForComponent(comp)` which delegates to `resetForComponent` for class changes and does partial preservation for same-class updates.

- [ ] **Step 1: Add failing tests**

Append to `packages/ng-prism/src/app/services/prism-renderer.service.spec.ts` inside `describe('PrismRendererService')`:

```typescript
  describe('reconcileForComponent', () => {
    it('should behave like resetForComponent on first call', () => {
      const comp = createComponent({
        inputs: [{ name: 'label', type: 'string', defaultValue: 'Hello', required: false }],
      });
      const { renderer, navigation } = setup({ components: [comp] });
      navigation.select(comp);

      renderer.reconcileForComponent(comp);

      expect(renderer.activeVariantIndex()).toBe(0);
      expect(renderer.inputValues()).toEqual({ label: 'Hello' });
    });

    it('should preserve variant index when className is unchanged', () => {
      const comp = createComponent({
        inputs: [{ name: 'label', type: 'string', defaultValue: 'Hi', required: false }],
        variants: [{ name: 'V1' }, { name: 'V2' }, { name: 'V3' }],
      });
      const { renderer, navigation } = setup({ components: [comp] });
      navigation.select(comp);
      renderer.resetForComponent(comp);
      renderer.selectVariant(2);

      const compRefreshed = createComponent({
        inputs: [{ name: 'label', type: 'string', defaultValue: 'Hi', required: false }],
        variants: [{ name: 'V1' }, { name: 'V2' }, { name: 'V3' }],
      });
      renderer.reconcileForComponent(compRefreshed);

      expect(renderer.activeVariantIndex()).toBe(2);
    });

    it('should clamp variant index when variants list shrinks', () => {
      const comp = createComponent({
        inputs: [],
        variants: [{ name: 'V1' }, { name: 'V2' }, { name: 'V3' }],
      });
      const { renderer, navigation } = setup({ components: [comp] });
      navigation.select(comp);
      renderer.resetForComponent(comp);
      renderer.selectVariant(2);

      const compShrunk = createComponent({
        inputs: [],
        variants: [{ name: 'V1' }],
      });
      renderer.reconcileForComponent(compShrunk);

      expect(renderer.activeVariantIndex()).toBe(0);
    });

    it('should preserve input values for inputs that still exist', () => {
      const comp = createComponent({
        inputs: [
          { name: 'label', type: 'string', defaultValue: 'Default', required: false },
          { name: 'count', type: 'number', defaultValue: 0, required: false },
        ],
      });
      const { renderer, navigation } = setup({ components: [comp] });
      navigation.select(comp);
      renderer.resetForComponent(comp);
      renderer.updateInput('label', 'User Value');
      renderer.updateInput('count', 42);

      renderer.reconcileForComponent(comp);

      expect(renderer.inputValues()['label']).toBe('User Value');
      expect(renderer.inputValues()['count']).toBe(42);
    });

    it('should discard values for inputs that no longer exist', () => {
      const comp = createComponent({
        inputs: [
          { name: 'label', type: 'string', required: false },
          { name: 'obsolete', type: 'string', required: false },
        ],
      });
      const { renderer, navigation } = setup({ components: [comp] });
      navigation.select(comp);
      renderer.resetForComponent(comp);
      renderer.updateInput('label', 'Keep');
      renderer.updateInput('obsolete', 'Drop');

      const compReduced = createComponent({
        inputs: [{ name: 'label', type: 'string', required: false }],
      });
      renderer.reconcileForComponent(compReduced);

      expect(renderer.inputValues()['label']).toBe('Keep');
      expect(renderer.inputValues()['obsolete']).toBeUndefined();
    });

    it('should merge variant defaults for newly added inputs', () => {
      const comp = createComponent({
        inputs: [{ name: 'label', type: 'string', required: false }],
        variants: [{ name: 'V1', inputs: { label: 'Orig' } }],
      });
      const { renderer, navigation } = setup({ components: [comp] });
      navigation.select(comp);
      renderer.resetForComponent(comp);

      const compExpanded = createComponent({
        inputs: [
          { name: 'label', type: 'string', required: false },
          { name: 'variant', type: 'string', required: false },
        ],
        variants: [{ name: 'V1', inputs: { label: 'Orig', variant: 'primary' } }],
      });
      renderer.reconcileForComponent(compExpanded);

      expect(renderer.inputValues()['label']).toBe('Orig');
      expect(renderer.inputValues()['variant']).toBe('primary');
    });

    it('should full-reset when className changes', () => {
      const first = createComponent({
        inputs: [{ name: 'label', type: 'string', defaultValue: 'A', required: false }],
      });
      first.meta.className = 'First';

      const { renderer, navigation } = setup({ components: [first] });
      navigation.select(first);
      renderer.resetForComponent(first);
      renderer.updateInput('label', 'Custom');

      const second = createComponent({
        inputs: [{ name: 'title', type: 'string', defaultValue: 'B', required: false }],
      });
      second.meta.className = 'Second';

      renderer.reconcileForComponent(second);

      expect(renderer.inputValues()['label']).toBeUndefined();
      expect(renderer.inputValues()['title']).toBe('B');
    });

    it('should preserve __prismContent__ on same-className reconcile', () => {
      const comp = createComponent({
        isDirective: true,
        host: '<button>',
        inputs: [{ name: 'tooltip', type: 'string', required: false }],
        variants: [{ name: 'V1', content: 'Hover me' }],
      });
      const { renderer, navigation } = setup({ components: [comp] });
      navigation.select(comp);
      renderer.resetForComponent(comp);
      expect(renderer.inputValues()['__prismContent__']).toBe('Hover me');

      renderer.reconcileForComponent(comp);

      expect(renderer.inputValues()['__prismContent__']).toBe('Hover me');
    });
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx nx test ng-prism -- --testPathPatterns=prism-renderer.service.spec`
Expected: FAIL — `renderer.reconcileForComponent is not a function`.

- [ ] **Step 3: Implement reconcileForComponent**

Modify `packages/ng-prism/src/app/services/prism-renderer.service.ts`. Add a private tracking field and the new method. The full file should be:

```typescript
import { inject, Injectable, signal } from '@angular/core';
import type { RuntimeComponent } from '../../plugin/plugin.types.js';
import { PrismNavigationService } from './prism-navigation.service.js';

@Injectable({ providedIn: 'root' })
export class PrismRendererService {
  private readonly navigationService = inject(PrismNavigationService);

  readonly activeVariantIndex = signal(0);
  readonly inputValues = signal<Record<string, unknown>>({});
  readonly activeContent = signal<string | Record<string, string> | undefined>(undefined);
  readonly renderedElement = signal<Element | null>(null);

  private _lastClassName: string | null = null;

  resetForComponent(comp: RuntimeComponent): void {
    this._lastClassName = comp.meta.className;
    this.activeVariantIndex.set(0);
    this.applyVariant(0, comp);
  }

  reconcileForComponent(comp: RuntimeComponent): void {
    const prev = this._lastClassName;
    this._lastClassName = comp.meta.className;

    if (prev !== comp.meta.className) {
      this.activeVariantIndex.set(0);
      this.applyVariant(0, comp);
      return;
    }

    const variants = comp.meta.showcaseConfig.variants ?? [];
    const maxIndex = Math.max(0, variants.length - 1);
    const preservedIndex = Math.min(this.activeVariantIndex(), maxIndex);
    this.activeVariantIndex.set(preservedIndex);

    const validKeys = new Set(comp.meta.inputs.map((i) => i.name));
    const currentValues = this.inputValues();
    const preserved: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(currentValues)) {
      if (validKeys.has(key) || key === '__prismContent__') {
        preserved[key] = value;
      }
    }

    const variant = variants[preservedIndex];
    const variantInputs = variant?.inputs ?? {};
    const merged: Record<string, unknown> = { ...variantInputs, ...preserved };

    if (comp.meta.componentMeta.isDirective && variant?.content && preserved['__prismContent__'] === undefined) {
      merged['__prismContent__'] = typeof variant.content === 'string' ? variant.content : '';
    }

    this.inputValues.set(merged);
    this.activeContent.set(comp.meta.componentMeta.isDirective ? undefined : variant?.content);
  }

  selectVariant(index: number): void {
    this.activeVariantIndex.set(index);
    const comp = this.navigationService.activeComponent();
    if (comp) this.applyVariant(index, comp);
  }

  updateInput(name: string, value: unknown): void {
    this.inputValues.update((prev) => ({ ...prev, [name]: value }));
  }

  private applyVariant(index: number, comp: RuntimeComponent): void {
    const defaults: Record<string, unknown> = {};
    for (const input of comp.meta.inputs) {
      if (input.defaultValue !== undefined) {
        defaults[input.name] = input.defaultValue;
      }
    }

    const requiredInputNames = new Set(
      comp.meta.inputs.filter((i) => i.required).map((i) => i.name),
    );

    const reset: Record<string, unknown> = {};
    for (const v of comp.meta.showcaseConfig.variants ?? []) {
      for (const key of Object.keys(v.inputs ?? {})) {
        if (!requiredInputNames.has(key) && !(key in reset)) {
          reset[key] = undefined;
        }
      }
    }

    const variant = comp.meta.showcaseConfig.variants?.[index];
    const values = { ...reset, ...defaults, ...(variant?.inputs ?? {}) };

    if (comp.meta.componentMeta.isDirective && variant?.content) {
      values['__prismContent__'] = typeof variant.content === 'string' ? variant.content : '';
    }

    this.inputValues.set(values);
    this.activeContent.set(comp.meta.componentMeta.isDirective ? undefined : variant?.content);
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx nx test ng-prism -- --testPathPatterns=prism-renderer.service.spec`
Expected: PASS — existing + new tests all green.

- [ ] **Step 5: Commit**

```bash
git add packages/ng-prism/src/app/services/prism-renderer.service.ts packages/ng-prism/src/app/services/prism-renderer.service.spec.ts
git commit -m "feat: add reconcileForComponent to preserve state on same-className updates"
```

---

### Task 4: Wire reconcileForComponent into PrismRendererComponent

**Files:**
- Modify: `packages/ng-prism/src/app/renderer/prism-renderer.component.ts`

The renderer component's effect currently calls `resetForComponent(comp)`. Replace with `reconcileForComponent(comp)` so that HMR-driven updates preserve state, while normal variant changes still go through `selectVariant`/`applyVariant` (unchanged).

- [ ] **Step 1: Update the effect in PrismRendererComponent**

In `packages/ng-prism/src/app/renderer/prism-renderer.component.ts`, locate the constructor effect around line 235-244. Change this block:

```typescript
  constructor() {
    effect(() => {
      const comp = this.navigationService.activeComponent();
      if (!comp) return;
      untracked(() => {
        this.codeVisible.set(false);
        this.rendererService.resetForComponent(comp);
        this.createComponent(comp);
      });
    });
```

To:

```typescript
  constructor() {
    effect(() => {
      const comp = this.navigationService.activeComponent();
      if (!comp) return;
      untracked(() => {
        this.codeVisible.set(false);
        this.rendererService.reconcileForComponent(comp);
        this.createComponent(comp);
      });
    });
```

Only `resetForComponent` → `reconcileForComponent`. Everything else stays identical.

- [ ] **Step 2: Run full test suite**

Run: `npx nx test ng-prism`
Expected: All tests pass (no renderer component tests exist specifically for this path, but no regressions).

- [ ] **Step 3: Commit**

```bash
git add packages/ng-prism/src/app/renderer/prism-renderer.component.ts
git commit -m "feat: use reconcileForComponent in renderer to preserve state on HMR"
```

---

### Task 5: Create enablePrismHmr helper

**Files:**
- Create: `packages/ng-prism/src/app/hmr.ts`
- Create: `packages/ng-prism/src/app/hmr.spec.ts`

The helper is a small function users call from their `main.ts` inside `import.meta.hot.accept`. It retrieves the `PrismManifestService` from the app's injector and calls `updateManifest`.

- [ ] **Step 1: Write the failing test**

Create `packages/ng-prism/src/app/hmr.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { ApplicationRef } from '@angular/core';
import type { RuntimeManifest } from '../plugin/plugin.types.js';
import { PRISM_MANIFEST } from './tokens/prism-tokens.js';
import { PrismManifestService } from './services/prism-manifest.service.js';
import { enablePrismHmr } from './hmr.js';

describe('enablePrismHmr', () => {
  it('should call updateManifest on the PrismManifestService', () => {
    const initial: RuntimeManifest = { components: [] };
    TestBed.configureTestingModule({
      providers: [{ provide: PRISM_MANIFEST, useValue: initial }],
    });
    const service = TestBed.inject(PrismManifestService);
    const appRef = TestBed.inject(ApplicationRef);
    const spy = jest.spyOn(service, 'updateManifest');

    const newManifest: RuntimeManifest = {
      components: [{
        type: class {} as any,
        meta: {
          className: 'NewOne',
          filePath: '/test.ts',
          showcaseConfig: { title: 'New' },
          inputs: [],
          outputs: [],
          componentMeta: { selector: 'x', standalone: true, isDirective: false },
        },
      }],
    };

    enablePrismHmr(appRef, newManifest);

    expect(spy).toHaveBeenCalledWith(newManifest);
  });

  it('should update components exposed via the service', () => {
    const initial: RuntimeManifest = { components: [] };
    TestBed.configureTestingModule({
      providers: [{ provide: PRISM_MANIFEST, useValue: initial }],
    });
    const service = TestBed.inject(PrismManifestService);
    const appRef = TestBed.inject(ApplicationRef);

    const newComp = {
      type: class {} as any,
      meta: {
        className: 'Added',
        filePath: '/test.ts',
        showcaseConfig: { title: 'Added' },
        inputs: [],
        outputs: [],
        componentMeta: { selector: 'x', standalone: true, isDirective: false },
      },
    };

    enablePrismHmr(appRef, { components: [newComp] });

    expect(service.components()).toEqual([newComp]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx nx test ng-prism -- --testPathPatterns=hmr.spec`
Expected: FAIL — module `./hmr.js` does not exist.

- [ ] **Step 3: Implement the helper**

Create `packages/ng-prism/src/app/hmr.ts`:

```typescript
import type { ApplicationRef } from '@angular/core';
import type { RuntimeManifest } from '../plugin/plugin.types.js';
import { PrismManifestService } from './services/prism-manifest.service.js';

export function enablePrismHmr(appRef: ApplicationRef, newManifest: RuntimeManifest): void {
  const service = appRef.injector.get(PrismManifestService);
  service.updateManifest(newManifest);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx nx test ng-prism -- --testPathPatterns=hmr.spec`
Expected: PASS — both tests green.

- [ ] **Step 5: Commit**

```bash
git add packages/ng-prism/src/app/hmr.ts packages/ng-prism/src/app/hmr.spec.ts
git commit -m "feat: add enablePrismHmr helper for runtime manifest updates"
```

---

### Task 6: Export enablePrismHmr from public API

**Files:**
- Modify: `packages/ng-prism/src/app/index.ts`

- [ ] **Step 1: Add the export**

In `packages/ng-prism/src/app/index.ts`, add a new line to the "Bootstrap helper" section:

```typescript
// Bootstrap helper
export { providePrism } from './provide-prism.js';
export type { ProvidePrismOptions } from './provide-prism.js';

// HMR helper
export { enablePrismHmr } from './hmr.js';
```

The top-level `packages/ng-prism/src/index.ts` already re-exports everything from `./app/index.js`, so no change is needed there.

- [ ] **Step 2: Verify with a full build**

Run: `npx nx build ng-prism`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add packages/ng-prism/src/app/index.ts
git commit -m "feat: expose enablePrismHmr in public API"
```

---

### Task 7: Documentation — User setup snippet

**Files:**
- Modify: `packages/ng-prism/README.md` (if it exists, otherwise skip) OR create a new doc

- [ ] **Step 1: Check for existing README**

Run: `ls packages/ng-prism/README.md docs/getting-started.md`

If `docs/getting-started.md` exists, proceed with Step 2. If neither exists, skip this task and commit a note.

- [ ] **Step 2: Add an HMR section**

In `docs/getting-started.md`, locate the section describing the `main.ts` bootstrap (search for `providePrism`). Append a new section below it:

```markdown
## Enabling HMR for Live Metadata Updates

ng-prism supports hot module replacement (HMR) for `@Showcase` metadata
changes. When enabled, edits to variant inputs, titles, categories, and other
metadata in your library source appear in the styleguide without a full reload.
UI state (active component, variant, control values) is preserved.

Add the following to your `main.ts`:

~~~typescript
import { bootstrapApplication } from '@angular/platform-browser';
import { providePrism, enablePrismHmr } from 'ng-prism';
import { PRISM_RUNTIME_MANIFEST } from './prism-manifest';
import { AppComponent } from './app.component';
import config from '../ng-prism.config';

const appRef = await bootstrapApplication(AppComponent, {
  providers: [providePrism(PRISM_RUNTIME_MANIFEST, config)],
});

if (import.meta.hot) {
  import.meta.hot.accept('./prism-manifest', (mod) => {
    if (mod) {
      enablePrismHmr(appRef, mod.PRISM_RUNTIME_MANIFEST);
    }
  });
}
~~~

Start the dev server with HMR enabled:

~~~
ng serve --hmr
~~~

**Note:** Changes to component source code (templates, logic) still trigger
normal Angular HMR. ng-prism's reactive manifest only handles decorator
metadata changes.
```

- [ ] **Step 3: Commit**

```bash
git add docs/getting-started.md
git commit -m "docs: document HMR setup for reactive manifest"
```

If the docs file doesn't exist, skip this task entirely.

---

### Task 8: Run full verification

**Files:** None (verification only)

- [ ] **Step 1: Full test suite**

Run: `npx nx test ng-prism`
Expected: All tests pass.

- [ ] **Step 2: Build**

Run: `npx nx build ng-prism`
Expected: Build succeeds.

- [ ] **Step 3: Report summary**

Report number of tests, number of new tests added, build time, any warnings.
