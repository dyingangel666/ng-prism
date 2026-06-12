# Sidebar Top-Level Sections — Design

**Date:** 2026-06-12
**Status:** Draft — pending user approval
**Affects:** `packages/ng-prism/src/decorator/showcase.types.ts`, `packages/ng-prism/src/app/services/prism-navigation.service.ts`, `packages/ng-prism/src/app/sidebar/prism-sidebar.component.ts`

## Problem

Die Sidebar hat heute zwei hartcodierte Top-Level-Bereiche: **Pages** (pinned, oben) und **Components**. Alles aus dem Scanner — sowohl `@Component`s als auch `@Directive`s — landet in **Components** und wird dort lediglich über das optionale `category`-Feld in Untergruppen aufgeteilt.

Für Libraries wie `sgui-lib`, die neben Komponenten auch eine relevante Zahl an Direktiven (und potenziell weitere Konstrukte wie Pipes) showcasen, ist diese Struktur nicht ausdrucksstark genug: Direktiven werden visuell mit Komponenten vermischt, obwohl sie konzeptionell eine andere Kategorie sind. Der bestehende Workaround — alle Direktiven in eine Sub-Category `"Directives"` zu packen — funktioniert, ist aber manuell und semantisch ungenau.

## Ziele

- Direktiven werden ohne Config-Aufwand als eigene Top-Level-Section angezeigt.
- Library-Autoren können beliebige weitere Top-Level-Sections definieren (z. B. `Pipes`, `Hooks`, `Utilities`).
- Innerhalb jeder Section bleibt die bekannte `category`-Gruppierung funktional.
- Existierende `@Showcase`-Calls bleiben unverändert lauffähig (kein Breaking Change am Decorator-Vertrag).

## Nicht-Ziele

- Plugin-API für Sections (`NgPrismPlugin.sections`) — out of scope, später nachrüstbar wenn Bedarf da ist.
- Konfigurierbare Section-Icons / Section-Reihenfolge via `defineConfig` — bewusst nicht im ersten Wurf.
- Konfigurierbares Default-Collapse-Verhalten pro Section.

## Design

### Section-Resolution

Eine Section wird pro `ScannedComponent` deterministisch abgeleitet:

```ts
function resolveSection(c: ScannedComponent): string {
  if (c.showcaseConfig.section) return c.showcaseConfig.section;
  return c.componentMeta.isDirective ? 'Directives' : 'Components';
}
```

`componentMeta.isDirective` wird vom Scanner heute bereits gesetzt (`component.scanner.ts`) — es ist **keine** Änderung am Builder/Scanner nötig.

### ShowcaseConfig — neue Felder

`packages/ng-prism/src/decorator/showcase.types.ts`:

```ts
export interface ShowcaseConfig<T = unknown> {
  // ... existing fields ...

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
}
```

Beide Felder optional, keine Breaking Changes.

### Navigation Service

`packages/ng-prism/src/app/services/prism-navigation.service.ts`:

`categoryTree` (Map<category, NavigationItem[]>) wird ersetzt durch `sectionTree` (Array<SectionNode>):

```ts
export interface SectionNode {
  name: string;
  order: number;
  totalCount: number;
  categories: CategoryNode[];
}

export interface CategoryNode {
  name: string;
  items: NavigationItem[];
}

readonly sectionTree = computed<SectionNode[]>(() => { /* ... */ });
```

**Aufbau-Algorithmus:**

1. Für jeden gefilterten Component aus `searchService.filteredComponents()`:
   - Section via `resolveSection()` bestimmen
   - Category aus `showcaseConfig.category` (Default `'Uncategorized'`)
   - In nested Map `Map<section, Map<category, NavigationItem[]>>` einsortieren
2. Sortierung **innerhalb** einer Category: wie heute (`componentOrder` → alphabetisch nach `title`).
3. Sortierung **innerhalb** einer Section über Categories: wie heute (`categoryOrder` → alphabetisch).
4. Sortierung **der Sections**:
   - Primär: minimaler `sectionOrder` aller Items in der Section
   - Sekundärer Tiebreak: fixe Reihenfolge `'Components'` < `'Directives'` < alphabetisch (für custom Sections)
5. Pages werden **nicht** in `sectionTree` aufgenommen — sie bleiben ein eigener oberer Bereich der Sidebar (unverändert).

Die alte `categoryTree`-API wird entfernt (interner Service, kein Public-Contract).

### Sidebar UI

`packages/ng-prism/src/app/sidebar/prism-sidebar.component.ts`:

Template-Struktur:

```
sb-pinned (Pages — unverändert)
  └ Page-Categories …

sb-section (NEU, pro Eintrag aus sectionTree)
  ├ sb-section-head: <icon> <name> <total>
  └ Category-Groups (wie heute)
       └ sb-group-head + sb-group-body
```

**Section-Icons** (fixe Map im Component):

```ts
const SECTION_ICONS: Record<string, string> = {
  Components: 'box',
  Directives: 'zap',
};
const DEFAULT_SECTION_ICON = 'cube';
```

**Collapse-Key-Schema:**

- Vorher: `comp:{category}` für Components, `page:{category}` für Pages
- Nachher: `sec:{section}:{category}` für alle Items im `sectionTree`, `page:{category}` unverändert
- Alte localStorage-Werte werden beim Laden ignoriert (kein Migrationscode — nur Collapse-State, kein Datenverlust)

**Section-Color-Akzent:**

- Section-Header bekommt einen kleinen Farb-Chip (`--chip` Variable), analog zu Categories
- Wiederverwendet die bestehende `categoryColor()`-Heuristik mit erweitertem `SECTION_COLORS`-Mapping für `Components` und `Directives`

**Empty Sections:**

- Sections ohne sichtbare Items (z. B. nach Filter) werden komplett ausgeblendet.

### Edge Cases & Backwards-Compat

| Fall                                                          | Verhalten                                                                                                                                                                                                                 |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Existing `@Showcase({ category: 'Directives' })` ohne section | Direktive landet jetzt automatisch in Section `'Directives'`, dort in Sub-Category `'Directives'`. Visuell redundant, aber funktional korrekt. Doku-Empfehlung: `category` entfernen oder zu echter Sub-Kategorie ändern. |
| `@Showcase({ section: 'Foo' })` auf einer `@Directive`        | Explizites `section` gewinnt — Direktive landet in `'Foo'`.                                                                                                                                                               |
| Custom section ohne `sectionOrder`                            | Order = 100, sortiert alphabetisch nach `'Components'` / `'Directives'`.                                                                                                                                                  |
| Section enthält nur eine Category                             | Wird normal als Category-Group gerendert (keine spezielle Flach-Logik).                                                                                                                                                   |
| `activeItem` nach Section-Wechsel                             | Unverändert — Identity über `className`, nicht Section-abhängig.                                                                                                                                                          |

## Implementierung — Reihenfolge

1. **Types:** Felder zu `ShowcaseConfig` ergänzen (`showcase.types.ts`)
2. **Scanner-Mapping:** `component.scanner.ts` (Parse-Schritt für `section`/`sectionOrder` aus AST → ShowcaseConfig) — analog zu existierenden Feldern wie `categoryOrder`
3. **Navigation Service:** `sectionTree` Computed bauen, `categoryTree` entfernen, Tests anpassen/erweitern
4. **Sidebar Component:** Template + Styles auf `sectionTree` umstellen, Icons + Collapse-Keys, alte `componentCategories` entfernen
5. **Docs:** Kurzer Hinweis in `docs/guide/...` (Decorator-Doku) zu `section` / `sectionOrder`

## Tests

**`prism-navigation.service.spec.ts`** (erweitern):

- `@Component` ohne `section` → Section `'Components'`
- `@Directive` ohne `section` → Section `'Directives'`
- `section: 'Pipes'` override → Section `'Pipes'`
- Section-Sortierung: `sectionOrder` lowest first
- Tiebreak: `'Components'` vor `'Directives'` vor `'Aardvark'` (alpha)
- Categories innerhalb Section korrekt gruppiert (bestehende Tests entsprechend angepasst)

**`component.scanner.spec.ts`** (erweitern):

- `section` / `sectionOrder` aus AST extrahiert

**`prism-sidebar.component.ts`:**

- Heute kein dedizierter Test — wir bleiben dabei (Service-Tests decken die Logik). Falls Render-Bugs auftauchen, dann gezielt einen Smoke-Test ergänzen.

## Risiken & offene Fragen

- **Bestehende sgui-lib Configs** mit `category: 'Directives'` zeigen nach Migration eine doppelte "Directives"-Ebene. Akzeptabel — User passt einmalig an. Migration ist nicht Pflicht.
- **Section-Icons** sind aktuell fix gemappt. Wenn jemand eine Custom-Section will, die ein anderes Icon braucht, ist das nicht steuerbar. → Wenn das in der Praxis aufkommt, später `defineConfig({ sections: [{ name, icon, order }] })` ergänzen.

## Out of Scope (für spätere Iterationen)

- Plugin-Beitrag zu Sections (`NgPrismPlugin.sections`)
- `defineConfig({ sections: [...] })` mit Custom Icon / Order / Default-Collapse
- Per-Section Suchfilter
