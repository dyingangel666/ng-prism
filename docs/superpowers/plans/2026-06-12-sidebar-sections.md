# Sidebar Top-Level Sections — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sidebar zeigt mehrere Top-Level-Sections (Components, Directives, custom) statt einer hartcodierten "Components"-Sektion. Direktiven werden automatisch erkannt; `@Showcase({ section: '...' })` erlaubt beliebige Overrides.

**Architecture:** Section wird aus `componentMeta.isDirective` + optionalem `showcaseConfig.section` deterministisch abgeleitet. `PrismNavigationService.categoryTree` wird durch `sectionTree` (verschachtelt: Section → Category → Items) ersetzt. Sidebar rendert einen `@for` über Sections statt der hartcodierten "Components"-Section. Pages-Block bleibt unverändert.

**Tech Stack:** Angular 21 Standalone Components, TypeScript 5.9, Jest, Nx 22, npm workspaces.

**Spec:** `docs/superpowers/specs/2026-06-12-sidebar-sections-design.md`

---

## File Structure

**Modify:**

- `packages/ng-prism/src/decorator/showcase.types.ts` — `section`, `sectionOrder` Felder
- `packages/ng-prism/src/builder/scanner/component.scanner.ts` — Felder aus AST extrahieren
- `packages/ng-prism/src/builder/scanner/component.scanner.spec.ts` — Tests für Extraktion
- `packages/ng-prism/src/app/services/prism-navigation.service.ts` — `sectionTree` statt `categoryTree`
- `packages/ng-prism/src/app/services/prism-navigation.service.spec.ts` — Tests anpassen + erweitern
- `packages/ng-prism/src/app/sidebar/prism-sidebar.component.ts` — Template + Styles auf Sections umstellen

**Add (no new files needed):** Section-Konstanten (`SECTION_ICONS`, `SECTION_COLORS`, `DEFAULT_SECTION_ORDER`) leben inline im Sidebar bzw. Navigation Service. Kein Aufsplitten in neue Dateien — die Logik ist klein und gehört zu ihrem Consumer.

**Known related gap (NOT in scope):** Der Scanner extrahiert heute `categoryOrder` und `componentOrder` nicht aus dem AST (sind im Typ deklariert, werden in `prism-navigation.service.ts:56-85` gelesen, aber nie befüllt). Das ist ein separater Bug. Dieser Plan extrahiert `section`/`sectionOrder` korrekt, fixt aber NICHT die existierende Lücke — Out of Scope.

---

## Pre-flight

- [ ] **Step 1: Auf main-Branch sein, alles committed**

Run:

```bash
git status
```

Expected: `working tree clean` (oder nur unrelated changes, die nicht in dem Plan-Scope liegen).

- [ ] **Step 2: Baseline-Tests grün**

Run:

```bash
npx nx test ng-prism
```

Expected: alle bestehenden Tests grün. Stelle sicher, dass kein vorhandener Test rot ist, bevor irgendwas geändert wird.

---

## Task 1: Add `section` / `sectionOrder` to ShowcaseConfig

**Files:**

- Modify: `packages/ng-prism/src/decorator/showcase.types.ts` (nach `categoryOrder` / `componentOrder`, vor `variants`)

- [ ] **Step 1: Felder in ShowcaseConfig einfügen**

In `packages/ng-prism/src/decorator/showcase.types.ts` direkt nach dem `componentOrder`-Feld (Zeile 52) einfügen:

```ts
  /**
   * Top-level section in the sidebar. Auto-detected if omitted:
   * `@Directive` → 'Directives', otherwise 'Components'. Free-form string —
   * any value creates a new top-level section (e.g. 'Pipes', 'Utilities').
   */
  section?: string;
  /**
   * Sort order of this section in the sidebar (lower = higher in list).
   * The section's effective order is the minimum `sectionOrder` of all its items.
   * Defaults: 'Components' → 0, 'Directives' → 10, all others → 100.
   */
  sectionOrder?: number;
```

- [ ] **Step 2: Typecheck**

Run:

```bash
npx nx build ng-prism
```

Expected: Build erfolgreich. Keine Konsumenten brechen (Felder sind optional).

- [ ] **Step 3: Commit**

```bash
npx nx format:write
git add packages/ng-prism/src/decorator/showcase.types.ts
git commit -m "feat(types): add optional section and sectionOrder to ShowcaseConfig"
```

---

## Task 2: Scanner extracts `section` / `sectionOrder`

Der Scanner-Spec lädt Fixture-Dateien aus `__fixtures__/` via `resolveEntryPointExports` (siehe `component.scanner.spec.ts:21-29`). Wir folgen dem Pattern: neue Fixture für die Section-Felder, dann Test darauf.

**Files:**

- Create: `packages/ng-prism/src/builder/scanner/__fixtures__/sectioned.component.ts`
- Modify: `packages/ng-prism/src/builder/scanner/__fixtures__/public-api.ts` (re-export)
- Modify: `packages/ng-prism/src/builder/scanner/component.scanner.ts` (Extraktion)
- Modify: `packages/ng-prism/src/builder/scanner/component.scanner.spec.ts` (Test)

- [ ] **Step 1: Fixture-Datei anlegen**

Datei `packages/ng-prism/src/builder/scanner/__fixtures__/sectioned.component.ts` erstellen:

```ts
import { Component } from '@angular/core';

interface ShowcaseConfig {
  title: string;
  category?: string;
  section?: string;
  sectionOrder?: number;
}

function Showcase(config: ShowcaseConfig): ClassDecorator {
  return () => {};
}

@Showcase({
  title: 'Sectioned',
  category: 'Misc',
  section: 'Pipes',
  sectionOrder: 5,
})
@Component({
  selector: 'sectioned',
  standalone: true,
  template: '',
})
export class SectionedComponent {}
```

- [ ] **Step 2: Fixture exportieren**

In `packages/ng-prism/src/builder/scanner/__fixtures__/public-api.ts` eine neue export-Zeile anhängen:

```ts
export { SectionedComponent } from './sectioned.component.js';
```

- [ ] **Step 3: Failing Tests in `component.scanner.spec.ts`**

Zuerst: den bestehenden Test `'should find only @Showcase-annotated components'` (Zeile 31–44 in der heutigen Version) anpassen, weil `toHaveLength(7)` jetzt zu `toHaveLength(8)` werden muss UND der neue Name in der Liste auftauchen muss. Konkret:

```ts
it('should find only @Showcase-annotated components', () => {
  const components = scanComponents(exports, checker);
  const names = components.map((c) => c.className);

  expect(names).toContain('ButtonComponent');
  expect(names).toContain('CardComponent');
  expect(names).toContain('SignalButtonComponent');
  expect(names).toContain('ModelInputComponent');
  expect(names).toContain('HighlightDirective');
  expect(names).toContain('InvalidBgComponent');
  expect(names).toContain('InvalidStatusComponent');
  expect(names).toContain('SectionedComponent');
  expect(names).not.toContain('NoShowcaseComponent');
  expect(components).toHaveLength(8);
});
```

Dann am Ende der `describe('scanComponents', ...)`-Suite (vor der schließenden Klammer) hinzufügen:

```ts
it('extracts section and sectionOrder from showcaseConfig', () => {
  const components = scanComponents(exports, checker);
  const sectioned = components.find(
    (c) => c.className === 'SectionedComponent'
  )!;

  expect(sectioned.showcaseConfig.section).toBe('Pipes');
  expect(sectioned.showcaseConfig.sectionOrder).toBe(5);
});

it('omits section and sectionOrder when not declared', () => {
  const components = scanComponents(exports, checker);
  const button = components.find((c) => c.className === 'ButtonComponent')!;

  expect(button.showcaseConfig.section).toBeUndefined();
  expect(button.showcaseConfig.sectionOrder).toBeUndefined();
});
```

- [ ] **Step 4: Tests ausführen — müssen fehlschlagen**

Run:

```bash
npx nx test ng-prism --testPathPattern=component.scanner
```

Expected:

- `'extracts section and sectionOrder'` schlägt fehl mit `expect(received).toBe('Pipes') — received: undefined`
- `'should find only @Showcase-annotated components'` schlägt **nicht** fehl (fixture wird beim ersten Lauf via `beforeAll` mitgescannt; nur die Felder fehlen)
- `'omits section …'` ist grün (Felder sind im Output ohnehin undefined, weil weder im Fixture noch im Scanner extrahiert)

- [ ] **Step 5: Extraktion in `component.scanner.ts` implementieren**

In `packages/ng-prism/src/builder/scanner/component.scanner.ts` im `extractShowcaseConfig`-Block (zwischen Zeile 128 `if (obj['category']) …` und Zeile 129 `if (obj['tags']) …`) einfügen:

```ts
if (obj['section']) config.section = obj['section'] as string;
if (typeof obj['sectionOrder'] === 'number') {
  config.sectionOrder = obj['sectionOrder'];
}
```

Wir prüfen `typeof === 'number'` für `sectionOrder`, weil `if (obj['sectionOrder'])` den Wert `0` (gültig — höchste Priorität) als falsy verwerfen würde.

- [ ] **Step 6: Test laufen lassen — alle grün**

Run:

```bash
npx nx test ng-prism --testPathPattern=component.scanner
```

Expected: alle Tests inkl. der zwei neuen grün.

- [ ] **Step 7: Commit**

```bash
npx nx format:write
git add packages/ng-prism/src/builder/scanner/__fixtures__/sectioned.component.ts packages/ng-prism/src/builder/scanner/__fixtures__/public-api.ts packages/ng-prism/src/builder/scanner/component.scanner.ts packages/ng-prism/src/builder/scanner/component.scanner.spec.ts
git commit -m "feat(scanner): extract section and sectionOrder from @Showcase config"
```

---

## Task 3: Add SectionNode types + section helpers to NavigationService

**Files:**

- Modify: `packages/ng-prism/src/app/services/prism-navigation.service.ts`

Diese Task fügt **nur** die neuen Typen, Konstanten und Helper-Funktionen ein, **ohne** `categoryTree` zu entfernen. Damit bleibt Task 3 self-contained und die Sidebar bricht nicht zwischen Tasks.

- [ ] **Step 1: Section-Konstanten und Resolver in prism-navigation.service.ts hinzufügen**

Oberhalb der `@Injectable`-Annotation in `prism-navigation.service.ts` einfügen:

```ts
import type { ScannedComponent } from '../../plugin/plugin.types.js';

const DEFAULT_SECTION_ORDER: Record<string, number> = {
  Components: 0,
  Directives: 10,
};

const SECTION_TIEBREAK: readonly string[] = ['Components', 'Directives'];

export interface CategoryNode {
  name: string;
  items: NavigationItem[];
}

export interface SectionNode {
  name: string;
  order: number;
  totalCount: number;
  categories: CategoryNode[];
}

export function resolveSection(c: ScannedComponent): string {
  if (c.showcaseConfig.section) return c.showcaseConfig.section;
  return c.componentMeta.isDirective ? 'Directives' : 'Components';
}

function defaultSectionOrder(name: string): number {
  return DEFAULT_SECTION_ORDER[name] ?? 100;
}

function sectionTiebreak(a: string, b: string): number {
  const ia = SECTION_TIEBREAK.indexOf(a);
  const ib = SECTION_TIEBREAK.indexOf(b);
  if (ia !== -1 && ib !== -1) return ia - ib;
  if (ia !== -1) return -1;
  if (ib !== -1) return 1;
  return a.localeCompare(b);
}
```

- [ ] **Step 2: Typecheck**

Run:

```bash
npx nx build ng-prism
```

Expected: erfolgreich (keine Konsumenten der neuen Symbole, nur additive Änderung).

- [ ] **Step 3: Tests laufen lassen**

Run:

```bash
npx nx test ng-prism --testPathPattern=prism-navigation
```

Expected: alle Tests grün (additive Änderung).

- [ ] **Step 4: Commit**

```bash
npx nx format:write
git add packages/ng-prism/src/app/services/prism-navigation.service.ts
git commit -m "feat(navigation): add SectionNode types and resolveSection helper"
```

---

## Task 4: Add `sectionTree` computed (parallel to `categoryTree`)

**Files:**

- Modify: `packages/ng-prism/src/app/services/prism-navigation.service.ts`
- Modify: `packages/ng-prism/src/app/services/prism-navigation.service.spec.ts`

`categoryTree` bleibt für Sidebar-Backwards-Compat erstmal stehen. Wir bauen `sectionTree` daneben, testen erschöpfend, und ziehen `categoryTree` in Task 6 zurück.

- [ ] **Step 1: Failing tests für sectionTree**

In `prism-navigation.service.spec.ts` einen neuen `describe`-Block am Ende der äußeren `describe('PrismNavigationService')`-Suite (vor der schließenden Klammer) einfügen.

Vorher: Helper `createComponent` erweitern, sodass `section`, `sectionOrder` und `isDirective` als Overrides funktionieren:

Ersetze in `prism-navigation.service.spec.ts` die bestehende `createComponent`-Funktion (Zeile 11–32) durch:

```ts
function createComponent(
  overrides: Partial<{
    title: string;
    category: string;
    className: string;
    section: string;
    sectionOrder: number;
    isDirective: boolean;
  }> = {}
): RuntimeComponent {
  return {
    type: class {} as any,
    meta: {
      className: overrides.className ?? 'Comp',
      filePath: '/test.ts',
      showcaseConfig: {
        title: overrides.title ?? 'Default',
        category: overrides.category,
        section: overrides.section,
        sectionOrder: overrides.sectionOrder,
      },
      inputs: [],
      outputs: [],
      componentMeta: {
        selector: 'test',
        standalone: true,
        isDirective: overrides.isDirective ?? false,
      },
    },
  };
}
```

Dann die folgende Test-Suite am Ende der `describe`-Block einfügen:

```ts
describe('sectionTree', () => {
  it('puts @Component into "Components" section by default', () => {
    const comp = createComponent({ className: 'Foo' });
    const { service } = setup({ components: [comp] });

    const tree = service.sectionTree();
    expect(tree.map((s) => s.name)).toEqual(['Components']);
    expect(tree[0].categories[0].items[0].kind).toBe('component');
  });

  it('puts @Directive into "Directives" section by default', () => {
    const dir = createComponent({ className: 'HiDir', isDirective: true });
    const { service } = setup({ components: [dir] });

    const tree = service.sectionTree();
    expect(tree.map((s) => s.name)).toEqual(['Directives']);
  });

  it('puts components into both sections when mixed', () => {
    const comp = createComponent({ className: 'Btn' });
    const dir = createComponent({ className: 'HiDir', isDirective: true });
    const { service } = setup({ components: [comp, dir] });

    const tree = service.sectionTree();
    expect(tree.map((s) => s.name)).toEqual(['Components', 'Directives']);
  });

  it('respects explicit section override on @Directive', () => {
    const dir = createComponent({
      className: 'HiDir',
      isDirective: true,
      section: 'Behavior',
    });
    const { service } = setup({ components: [dir] });

    const tree = service.sectionTree();
    expect(tree.map((s) => s.name)).toEqual(['Behavior']);
  });

  it('orders sections: Components before Directives by default', () => {
    const dir = createComponent({ className: 'HiDir', isDirective: true });
    const comp = createComponent({ className: 'Btn' });
    const { service } = setup({ components: [dir, comp] });

    const tree = service.sectionTree();
    expect(tree.map((s) => s.name)).toEqual(['Components', 'Directives']);
  });

  it('orders sections by lowest sectionOrder among items', () => {
    const a = createComponent({
      className: 'A',
      section: 'Custom',
      sectionOrder: -5,
    });
    const b = createComponent({ className: 'B' });
    const { service } = setup({ components: [a, b] });

    const tree = service.sectionTree();
    expect(tree.map((s) => s.name)).toEqual(['Custom', 'Components']);
  });

  it('sorts custom sections alphabetically after Components/Directives when no sectionOrder', () => {
    const a = createComponent({ className: 'A', section: 'Zeta' });
    const b = createComponent({ className: 'B', section: 'Alpha' });
    const c = createComponent({ className: 'C' });
    const { service } = setup({ components: [a, b, c] });

    const tree = service.sectionTree();
    expect(tree.map((s) => s.name)).toEqual(['Components', 'Alpha', 'Zeta']);
  });

  it('groups items inside a section by category', () => {
    const a = createComponent({
      className: 'A',
      category: 'Forms',
    });
    const b = createComponent({
      className: 'B',
      category: 'Forms',
    });
    const c = createComponent({
      className: 'C',
      category: 'Layout',
    });
    const { service } = setup({ components: [a, b, c] });

    const tree = service.sectionTree();
    expect(tree).toHaveLength(1);
    expect(tree[0].name).toBe('Components');
    expect(tree[0].categories.map((c) => c.name)).toEqual(['Forms', 'Layout']);
    expect(tree[0].categories[0].items).toHaveLength(2);
    expect(tree[0].categories[1].items).toHaveLength(1);
  });

  it('uses "Uncategorized" when category is missing', () => {
    const comp = createComponent({ className: 'Foo' });
    const { service } = setup({ components: [comp] });

    const tree = service.sectionTree();
    expect(tree[0].categories[0].name).toBe('Uncategorized');
  });

  it('exposes totalCount per section', () => {
    const a = createComponent({ className: 'A' });
    const b = createComponent({ className: 'B' });
    const c = createComponent({
      className: 'C',
      isDirective: true,
    });
    const { service } = setup({ components: [a, b, c] });

    const tree = service.sectionTree();
    const comps = tree.find((s) => s.name === 'Components');
    const dirs = tree.find((s) => s.name === 'Directives');
    expect(comps?.totalCount).toBe(2);
    expect(dirs?.totalCount).toBe(1);
  });
});
```

- [ ] **Step 2: Tests ausführen — sectionTree-Tests müssen fehlschlagen**

Run:

```bash
npx nx test ng-prism --testPathPattern=prism-navigation
```

Expected: Die neuen `sectionTree`-Tests schlagen fehl mit `service.sectionTree is not a function`. Bestehende Tests bleiben grün.

- [ ] **Step 3: `sectionTree` Computed implementieren**

In `prism-navigation.service.ts` direkt unter dem bestehenden `categoryTree` Computed (Zeile 35–93) einfügen:

```ts
  readonly sectionTree = computed<SectionNode[]>(() => {
    const comps = this.searchService.filteredComponents();

    // section → category → items
    const sections = new Map<string, Map<string, NavigationItem[]>>();
    // track the minimum sectionOrder we've seen per section
    const sectionOrders = new Map<string, number>();

    for (const comp of comps) {
      const section = resolveSection(comp);
      const category = comp.meta.showcaseConfig.category ?? 'Uncategorized';

      const catMap = sections.get(section) ?? new Map<string, NavigationItem[]>();
      const items = catMap.get(category) ?? [];
      items.push({ kind: 'component', data: comp });
      catMap.set(category, items);
      sections.set(section, catMap);

      const explicit = comp.meta.showcaseConfig.sectionOrder;
      const current = sectionOrders.get(section);
      if (explicit !== undefined) {
        sectionOrders.set(
          section,
          current === undefined ? explicit : Math.min(current, explicit),
        );
      }
    }

    const result: SectionNode[] = [];
    for (const [name, catMap] of sections.entries()) {
      const order = sectionOrders.get(name) ?? defaultSectionOrder(name);

      const categories: CategoryNode[] = [];
      for (const [catName, items] of catMap.entries()) {
        items.sort((a, b) => {
          const oa =
            a.kind === 'component'
              ? a.data.meta.showcaseConfig.componentOrder ?? Infinity
              : Infinity;
          const ob =
            b.kind === 'component'
              ? b.data.meta.showcaseConfig.componentOrder ?? Infinity
              : Infinity;
          if (oa !== ob) return oa - ob;
          const la =
            a.kind === 'component' ? a.data.meta.showcaseConfig.title : '';
          const lb =
            b.kind === 'component' ? b.data.meta.showcaseConfig.title : '';
          return la.localeCompare(lb);
        });
        categories.push({ name: catName, items });
      }

      categories.sort((a, b) => {
        const oa = Math.min(
          ...a.items.map((i) =>
            i.kind === 'component'
              ? i.data.meta.showcaseConfig.categoryOrder ?? Infinity
              : Infinity,
          ),
        );
        const ob = Math.min(
          ...b.items.map((i) =>
            i.kind === 'component'
              ? i.data.meta.showcaseConfig.categoryOrder ?? Infinity
              : Infinity,
          ),
        );
        if (oa !== ob) return oa - ob;
        return a.name.localeCompare(b.name);
      });

      const totalCount = categories.reduce((sum, c) => sum + c.items.length, 0);
      result.push({ name, order, totalCount, categories });
    }

    result.sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      return sectionTiebreak(a.name, b.name);
    });

    return result;
  });
```

- [ ] **Step 4: Tests ausführen — alle grün**

Run:

```bash
npx nx test ng-prism --testPathPattern=prism-navigation
```

Expected: alle Tests grün — sowohl die alten `categoryTree`-Tests als auch die neuen `sectionTree`-Tests.

- [ ] **Step 5: Commit**

```bash
npx nx format:write
git add packages/ng-prism/src/app/services/prism-navigation.service.ts packages/ng-prism/src/app/services/prism-navigation.service.spec.ts
git commit -m "feat(navigation): add sectionTree computed alongside categoryTree"
```

---

## Task 5: Sidebar rendert `sectionTree`

**Files:**

- Modify: `packages/ng-prism/src/app/sidebar/prism-sidebar.component.ts`

- [ ] **Step 1: `SECTION_ICONS` Map + Helper am Top-Level der Datei hinzufügen**

Direkt unter `CATEGORY_COLORS` (Zeile 28) einfügen:

```ts
const SECTION_ICONS: Record<string, string> = {
  Components: 'box',
  Directives: 'zap',
};
const DEFAULT_SECTION_ICON = 'cube';

function sectionIcon(name: string): string {
  return SECTION_ICONS[name] ?? DEFAULT_SECTION_ICON;
}
```

- [ ] **Step 2: `componentCategories` Computed durch `componentSections` ersetzen**

Im `PrismSidebarComponent` (Zeile 388–401) ersetze das bestehende `componentCategories` Computed durch:

```ts
  protected readonly componentSections = computed(() => {
    return this.navigationService.sectionTree().map((section) => ({
      name: section.name,
      icon: sectionIcon(section.name),
      color: categoryColor(section.name),
      totalCount: section.totalCount,
      categories: section.categories.map((cat) => ({
        name: cat.name,
        color: categoryColor(cat.name),
        items: cat.items,
      })),
    }));
  });
```

`totalComponents` Computed kann weg (Zeile 403–405) — der Count steht jetzt pro Section. Stattdessen ggf. behalten und mit `this.componentSections().reduce((s, sec) => s + sec.totalCount, 0)` ersetzen, wenn die Komponente das noch irgendwo nutzt. Prüfe das Template: aktuell wird `totalComponents()` nur in der hartcodierten "Components"-Section verwendet → kann mit Section-Refactor entfernt werden.

- [ ] **Step 3: Template auf Sections umstellen**

Im `template:` (Zeile 50–151) den Block ab `@if (componentCategories().length > 0)` (Zeile 103) bis zum schließenden `}` der äußeren `@for (cat of componentCategories(); …)` (Zeile 148) ersetzen durch:

```html
@for (section of componentSections(); track section.name) {
<div class="sb-section-head">
  <span class="sb-section-head-l">
    <prism-icon [name]="section.icon" [size]="10" class="sb-section-icon" />
    {{ section.name }}
  </span>
  <span>{{ section.totalCount }}</span>
</div>
@for (cat of section.categories; track cat.name) {
<div
  class="sb-group"
  [class.sb-group--collapsed]="isCollapsed('sec:' + section.name + ':' + cat.name)"
>
  <button
    class="sb-group-head"
    (click)="toggleCollapse('sec:' + section.name + ':' + cat.name)"
    [attr.aria-expanded]="!isCollapsed('sec:' + section.name + ':' + cat.name)"
  >
    <prism-icon name="chevron-down" [size]="10" />
    <span class="sb-group-chip" [style.--chip]="cat.color"></span>
    {{ cat.name }}
    <span class="sb-group-count">{{ cat.items.length }}</span>
  </button>
  @if (!isCollapsed('sec:' + section.name + ':' + cat.name)) {
  <div class="sb-group-body">
    @for (item of cat.items; track itemKey(item)) {
    <button
      class="sb-item"
      [class.sb-item--active]="isActive(item)"
      [class.sb-item--deprecated]="itemStatus(item) === 'deprecated'"
      [attr.title]="itemTooltip(item)"
      (click)="onSelect(item)"
    >
      <prism-icon name="box" [size]="12" class="sb-item-icon" />
      <span class="sb-item-name">{{ itemLabel(item) }}</span>
      @if (itemStatus(item) === 'wip') {
      <span class="sb-item-status" title="Work in progress">
        <span class="sb-item-status-dot"></span>
      </span>
      }
    </button>
    }
  </div>
  }
</div>
} }
```

Hinweis: `[name]="section.icon"` ist eine Property-Binding statt der bisherigen statischen `name="box"`-Verwendung. Wenn `PrismIconComponent` ein Signal-Input verwendet, ist das OK; falls statisch typed, bitte gegen die Signatur prüfen — `name` ist ohnehin ein String-Input.

- [ ] **Step 4: Alte `totalComponents` Computed + alten Import entfernen**

`totalComponents` (Zeile 403–405) löschen. Falls dadurch der `PrismManifestService`-Import (Zeile 15) unbenutzt wird, ihn ebenfalls entfernen.

- [ ] **Step 5: Build + Tests**

Run:

```bash
npx nx build ng-prism
npx nx test ng-prism
```

Expected: Build grün. Bestehende Sidebar hat keine Tests, also keine spec-Failures von dort.

- [ ] **Step 6: Lint**

Run:

```bash
npx nx lint ng-prism
```

Expected: keine neuen Warnings/Errors (insbesondere `no-unused-vars`).

- [ ] **Step 7: Commit**

```bash
npx nx format:write
git add packages/ng-prism/src/app/sidebar/prism-sidebar.component.ts
git commit -m "feat(sidebar): render top-level sections from sectionTree"
```

---

## Task 6: Entferne `categoryTree` aus NavigationService

`categoryTree` hat jetzt nur noch Tests als Consumer (Sidebar wurde umgestellt). Wir ziehen es zurück.

**Files:**

- Modify: `packages/ng-prism/src/app/services/prism-navigation.service.ts`
- Modify: `packages/ng-prism/src/app/services/prism-navigation.service.spec.ts`

- [ ] **Step 1: Verifizieren, dass `categoryTree` keinen weiteren Caller hat**

Run:

```bash
grep -rn "categoryTree" packages/ng-prism/src/
```

Expected: nur noch in `prism-navigation.service.ts` (Definition) und `prism-navigation.service.spec.ts` (Test). Wenn andere Treffer auftauchen, STOP — den Caller zuerst umstellen, dann diesen Task fortsetzen.

- [ ] **Step 2: `categoryTree` Computed entfernen**

In `prism-navigation.service.ts` das gesamte `categoryTree` Computed (Zeile 35–93, beginnend mit `readonly categoryTree = …` bis zum schließenden `});`) löschen.

- [ ] **Step 3: Den `categoryTree`-Test entfernen**

In `prism-navigation.service.spec.ts` den Test `'should build categoryTree from filtered components'` (Zeile 106–118) entfernen.

- [ ] **Step 4: Tests laufen lassen**

Run:

```bash
npx nx test ng-prism --testPathPattern=prism-navigation
```

Expected: alle Tests grün.

- [ ] **Step 5: Build + Lint**

Run:

```bash
npx nx build ng-prism
npx nx lint ng-prism
```

Expected: grün.

- [ ] **Step 6: Commit**

```bash
npx nx format:write
git add packages/ng-prism/src/app/services/prism-navigation.service.ts packages/ng-prism/src/app/services/prism-navigation.service.spec.ts
git commit -m "refactor(navigation): remove categoryTree (replaced by sectionTree)"
```

---

## Task 7: Manueller Smoke-Test im test-workspace

Wir haben `test-workspace/` als Integration-Sandbox. Eine `@Directive` mit `@Showcase` zeigen, dass Auto-Erkennung funktioniert.

**Files:**

- Modify (oder neu): test-workspace Library — ein `@Directive` mit `@Showcase` ergänzen, falls noch keiner existiert.

- [ ] **Step 1: Check, ob test-workspace bereits eine showcased Directive hat**

Run:

```bash
grep -rn "@Directive" test-workspace/projects/*/src/lib/ 2>/dev/null
grep -rln "@Showcase" test-workspace/projects/*/src/lib/ 2>/dev/null
```

- Falls eine Directive mit `@Showcase` existiert: skip Step 2.
- Falls nicht: kurze Demo-Directive bauen (Step 2).

- [ ] **Step 2 (conditional): Demo-Directive ergänzen**

In `test-workspace/projects/test-lib/src/lib/` eine neue Datei `autofocus.directive.ts`:

```ts
import { AfterViewInit, Directive, ElementRef, inject } from '@angular/core';
import { Showcase } from '@ng-prism/core';

@Showcase({
  title: 'Autofocus',
  description: 'Sets focus on the host element after view init.',
  category: 'Behavior',
  host: '<input type="text" appAutofocus placeholder="I get focus" />',
})
@Directive({
  selector: '[appAutofocus]',
  standalone: true,
})
export class AutofocusDirective implements AfterViewInit {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  ngAfterViewInit(): void {
    this.el.nativeElement.focus?.();
  }
}
```

Und im public API (`test-workspace/projects/test-lib/src/public-api.ts` o.ä.) re-exportieren:

```ts
export * from './lib/autofocus.directive';
```

- [ ] **Step 3: Serve starten und Sidebar prüfen**

Run:

```bash
npx nx serve test-lib-prism
```

Im Browser (URL aus dem Serve-Output) prüfen:

1. Sidebar zeigt zwei Top-Level-Sections: **Components** und **Directives**.
2. Counter neben jeder Section-Headline stimmt.
3. Section "Directives" hat ein anderes Icon (`zap`) als "Components" (`box`).
4. Collapse/Expand funktioniert pro Category, State persistiert über Reload (localStorage-Key `ng-prism-sidebar-collapsed` enthält `sec:Components:…` und `sec:Directives:…`).
5. Search-Filter blendet leere Sections aus.

- [ ] **Step 4: Optional — Custom Section testen**

Eine bestehende Component temporär mit `section: 'Utilities'` annotieren und Browser-Refresh. Sidebar sollte jetzt drei Sections zeigen (Components, Directives, Utilities — letzte unten).

Annotation wieder rückgängig machen, **bevor** committed wird.

- [ ] **Step 5: Server stoppen, falls test-workspace verändert wurde, commit**

```bash
npx nx format:write
git status
git add test-workspace/projects/test-lib/
git commit -m "test(workspace): add Autofocus directive showcase for sections smoke test"
```

(Skip dieser Commit, falls keine test-workspace-Änderungen nötig waren.)

---

## Task 8: Docs-Update

**Files:**

- Modify: `docs/api/showcase-config.md` (API-Referenz für `ShowcaseConfig`)
- Modify: `docs/guide/showcase-decorator.md` (User-Guide für `@Showcase`)

- [ ] **Step 1: `docs/api/showcase-config.md` ergänzen**

Die Datei einmal öffnen, den Block für `category` finden, und direkt **nach** dem `categoryOrder`/`componentOrder`-Block (oder wo es konzeptionell passt) folgenden Abschnitt einfügen. Falls das Schema-/Tabellen-Format ist (z. B. eine Markdown-Tabelle), die zwei Zeilen analog zu `category` / `categoryOrder` einfügen — nicht den Free-Form-Block.

Free-Form (falls die Datei Prosa nutzt):

````markdown
### `section?: string`

Top-level grouping in the sidebar. Auto-detected from the decorator type:
`@Directive` → `'Directives'`, `@Component` → `'Components'`. Set explicitly to
create custom sections (e.g. `'Pipes'`, `'Utilities'`).

```ts
@Showcase({ title: 'AutofocusDirective', section: 'Behavior' })
@Directive({ selector: '[appAutofocus]', standalone: true })
export class AutofocusDirective {}
```

### `sectionOrder?: number`

Numeric sort hint for the section in the sidebar (lower = higher). The section's
effective order is the lowest `sectionOrder` of any item it contains.
Defaults: `Components` → 0, `Directives` → 10, custom → 100.
````

- [ ] **Step 2: `docs/guide/showcase-decorator.md` ergänzen**

Den User-Guide um einen kurzen Hinweis zu Sections erweitern. Den existierenden Abschnitt zu `category` finden und direkt danach einen Mini-Abschnitt einfügen:

```markdown
## Sections

`@Directive`-Showcases erscheinen automatisch in einer eigenen Top-Level-Section
**Directives** (analog zu **Components** für `@Component`). Mit `section: 'Pipes'`
oder einem beliebigen anderen String lässt sich eine weitere Section anlegen.
Innerhalb jeder Section bleibt `category` für die Sub-Gruppierung verantwortlich.

`sectionOrder` steuert die Reihenfolge der Sections (lower = höher).
```

- [ ] **Step 3: Commit**

```bash
git add docs/api/showcase-config.md docs/guide/showcase-decorator.md
git commit -m "docs: document section and sectionOrder fields"
```

---

## Final verification

- [ ] **Step 1: Full test suite**

Run:

```bash
npx nx test ng-prism
```

Expected: alle Tests grün.

- [ ] **Step 2: Build all affected**

Run:

```bash
npx nx run-many -t build
```

Expected: alle Builds erfolgreich. Falls Plugins (figma, jsdoc, coverage) als affected gelten — sie sollten unverändert bauen.

- [ ] **Step 3: Format-Check (CI-äquivalent)**

Run:

```bash
npx nx format:check
```

Expected: keine Diffs.

- [ ] **Step 4: Lint**

Run:

```bash
npx nx run-many -t lint
```

Expected: keine neuen Errors.

- [ ] **Step 5: Commit-Log review**

Run:

```bash
git log --oneline main..HEAD
```

Expected eight commits (oder weniger, je nach Conditional Steps):

1. `feat(types): add optional section and sectionOrder …`
2. `feat(scanner): extract section and sectionOrder …`
3. `feat(navigation): add SectionNode types …`
4. `feat(navigation): add sectionTree computed …`
5. `feat(sidebar): render top-level sections …`
6. `refactor(navigation): remove categoryTree …`
7. `test(workspace): add Autofocus directive …` (optional)
8. `docs: document section and sectionOrder fields`
