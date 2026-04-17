# Feature Plan: Performance Profiling

**Status:** Planung
**Priorität:** Hoch
**Ziel:** Bundle-Size-Impact, Render-Time und Memory-Footprint direkt in der Komponenten-Ansicht — keine externe Tooling nötig.

---

## Übersicht

Storybook bietet kein integriertes Performance-Profiling. ng-prism kann dieses Gap als Alleinstellungsmerkmal besetzen. Das Feature macht Regressions-Erkennung früh möglich: Entwickler sehen sofort, ob ein Refactoring die Bundle-Größe aufbläht oder die Render-Zeit verdoppelt.

Das Feature besteht aus drei Messdimensionen:

| Dimension     | Zeitpunkt    | Datenquelle                              |
|---------------|--------------|------------------------------------------|
| Bundle Impact | Build-time   | TypeScript Compiler API, `zlib`          |
| Render Time   | Runtime      | `Performance API` (marks/measures)       |
| Memory        | Runtime      | `performance.memory` (Chrome only)       |

---

## Architektur-Entscheidung: Plugin vs. Core

**Entscheidung: Plugin `@ng-prism/plugin-perf`**

Begründung:
- Bundle-Analyse ist optionaler Build-Overhead — nicht jeder Nutzer braucht ihn
- `performance.memory` ist Chrome-only und gehört nicht in Core
- Render-Timing ist optional (kann CD-Zyklen beeinflussen bei sehr häufigen Messungen)
- Folgt dem Präzedenzfall von A11y: auch als separates Plugin (`@ng-prism/plugin-a11y`) ausgeliefert

**Aber:** Der Core braucht einen minimalen Hook-Punkt für Render-Timing.

---

## Core-Erweiterungen (Pakete: `packages/ng-prism/`)

### 1. `PrismRendererService` — Timing-Marks

`PrismRendererComponent` emittiert `performance.mark()` an zwei Stellen:

```typescript
// Vor createComponent():
performance.mark('prism:render:start', { detail: { selector } });

// Nach createComponent() + detectChanges():
performance.mark('prism:render:end', { detail: { selector } });
performance.measure('prism:render', 'prism:render:start', 'prism:render:end');
```

Für Input-Updates (Re-Renders):
```typescript
// In updateInput(), vor/nach componentRef.setInput():
performance.mark('prism:rerender:start');
// ... setInput + detectChanges ...
performance.mark('prism:rerender:end');
performance.measure('prism:rerender', 'prism:rerender:start', 'prism:rerender:end');
```

Diese Marks sind **zero-coupling** — der Core braucht keine Abhängigkeit auf das Plugin.
Das Plugin registriert einen `PerformanceObserver` und hört auf diese Marks.

### 2. `PrismManifest` — Bundle-Daten im Manifest

`ScannedComponent` bekommt ein optionales Feld:

```typescript
// src/builder/scanner/scanner.types.ts
export interface BundleMetrics {
  sourceSize: number;       // bytes (raw TypeScript source)
  gzipEstimate: number;     // bytes (zlib.gzip approximation)
  directImports: number;    // Anzahl top-level Imports
  importList: string[];     // Import-Specifier-Namen
  treeDepth: number;        // Tiefe des Import-Graphen (max 5)
}

// Ergänzung in ScannedComponent:
export interface ScannedComponent {
  // ...bestehende Felder...
  meta?: {
    bundle?: BundleMetrics;
    // ...andere Plugin-Metadaten...
  };
}
```

---

## Plugin-Paket `@ng-prism/plugin-perf`

**Pfad:** `packages/plugin-perf/`
**npm:** `@ng-prism/plugin-perf`
**peerDeps:** `ng-prism`, `@angular/core`, `@angular/platform-browser`

### Dateistruktur

```
packages/plugin-perf/
├── package.json
├── tsconfig.json
├── project.json          (Nx)
├── src/
│   ├── index.ts          (public API)
│   ├── perf.plugin.ts    (perfPlugin() Factory)
│   ├── perf.types.ts     (Interfaces)
│   ├── perf-panel.component.ts     (Haupt-Panel, Sub-Tabs)
│   ├── bundle/
│   │   ├── bundle-scanner.ts       (Build-time: onComponentScanned)
│   │   ├── bundle-section.component.ts
│   │   └── bundle-scanner.spec.ts
│   ├── render/
│   │   ├── perf-render.service.ts  (PerformanceObserver, Signal-State)
│   │   ├── render-section.component.ts
│   │   ├── sparkline.component.ts  (SVG-Waveform)
│   │   └── perf-render.service.spec.ts
│   └── memory/
│       ├── perf-memory.service.ts  (performance.memory, Snapshots)
│       ├── memory-section.component.ts
│       └── perf-memory.service.spec.ts
```

### Public API (`src/index.ts`)

```typescript
export { perfPlugin } from './perf.plugin.js';
export type { PerfPluginOptions, PerfThresholds } from './perf.types.js';
```

---

## Phase 1: Bundle-Analyse (Build-time)

### `bundle-scanner.ts`

Wird vom `onComponentScanned`-Hook aufgerufen. Bekommt den absoluten Pfad zur
Komponenten-Quelldatei und liefert `BundleMetrics`.

**Algorithmus:**
1. Source-Datei mit `fs.readFileSync()` lesen → `sourceSize` in Bytes
2. `zlib.gzip(source)` → `gzipEstimate`
3. `ts.createSourceFile()` → alle `ImportDeclaration` nodes sammeln → `directImports` + `importList`
4. Import-Graph traversieren (max 5 Tiefenschritte, nur relative Imports) → `treeDepth`

**Performance-Grenze:** Import-Graph-Traversal wird auf relative Imports beschränkt
(kein Node-Modules-Scan). Externe Pakete werden als Blatt-Knoten gewertet.

**Hook-Integration:**

```typescript
// perf.plugin.ts
export function perfPlugin(options?: PerfPluginOptions): NgPrismPlugin {
  return {
    name: 'ng-prism/perf',

    onComponentScanned(component) {
      const bundle = scanBundle(component.filePath, options?.bundleThresholds);
      component.showcaseConfig.meta ??= {};
      component.showcaseConfig.meta['perf'] = { bundle };
    },

    panels: [{
      id: 'perf',
      label: 'Performance',
      loadComponent: () => import('./perf-panel.component.js').then(m => m.PerfPanelComponent),
    }],
  };
}
```

---

## Phase 2: Render-Time Profiling (Runtime)

### `PerfRenderService`

Angular-Service, der einen `PerformanceObserver` auf `prism:render` und
`prism:rerender` Measures registriert.

**State (Signals):**

```typescript
readonly isRecording = signal(false);
readonly initialRender = signal<number | null>(null);
readonly rerenders = signal<number[]>([]);  // circular buffer, max 50

readonly avgRerender = computed(() => /* Mittelwert */);
readonly p95Rerender = computed(() => /* 95. Perzentil */);
readonly maxRerender = computed(() => /* Maximum */);
readonly cdRunCount = signal(0);
```

**Lifecycle:**
- `startRecording()` → PerformanceObserver aktivieren
- `stopRecording()` → Observer disconnect
- `clear()` → alle Signals zurücksetzen
- Komponenten-Wechsel (via Navigation-Service-Effect) → auto clear

### `SparklineComponent`

Rendert einen SVG-Waveform-Plot der letzten N Render-Zeiten.

```typescript
@Component({
  selector: 'perf-sparkline',
  inputs: ['samples', 'thresholdWarn', 'thresholdCrit', 'height'],
  // ...
})
```

- Kein Canvas, kein externes Chart-Lib — pure SVG mit Angular computed-Path-Strings
- Glow-Effekt via SVG `<filter>` (wie im Prototyp)
- Animierter "current"-Punkt (ripple-Animation)
- Threshold-Linien als gestrichelte `<line>`-Elemente
- `viewBox="0 0 600 52"` mit `preserveAspectRatio="none"` → responsive

---

## Phase 3: Memory-Footprint (Runtime)

### `PerfMemoryService`

Nimmt Heap-Snapshots an definierten Punkten.

```typescript
interface HeapSnapshot {
  label: string;
  bytes: number;
  timestamp: number;
}

readonly snapshots = signal<HeapSnapshot[]>([]);
readonly available = computed(() => 'memory' in performance);
```

**Snapshot-Timing:**
- `snapshotBefore()` — vor `createComponent()`
- `snapshotAfter()` — nach erstem `detectChanges()` (50ms Delay für GC-Stabilität)
- `snapshotDestroy()` — nach `componentRef.destroy()` + 100ms GC-Delay

**Integration in Core:**
Der Core kann nicht direkt auf den `PerfMemoryService` zugreifen (zirkuläre Abhängigkeit).
Lösung: **Injection Token** `PRISM_RENDERER_HOOKS` (ähnlich wie Angular Router Guards):

```typescript
// Core: src/app/tokens/renderer-hooks.token.ts
export interface PrismRendererHooks {
  onBeforeCreate?(selector: string): void;
  onAfterCreate?(selector: string): void;
  onAfterDestroy?(selector: string): void;
}

export const PRISM_RENDERER_HOOKS =
  new InjectionToken<PrismRendererHooks>('PRISM_RENDERER_HOOKS');
```

Das Plugin registriert den `PerfMemoryService` als Provider für diesen Token.
Der Core-Renderer ruft optional `inject(PRISM_RENDERER_HOOKS, { optional: true })` auf.

---

## Typen-Übersicht (`perf.types.ts`)

```typescript
export interface PerfThresholds {
  bundleWarnKb: number;    // default: 20
  bundleCritKb: number;    // default: 50
  renderWarnMs: number;    // default: 5
  renderCritMs: number;    // default: 16  (60fps budget)
  memoryWarnMb: number;    // default: 5
  memoryLeakMb: number;    // default: 0.5 (nach Destroy)
}

export interface PerfPluginOptions {
  thresholds?: Partial<PerfThresholds>;
  bundle?: {
    maxTreeDepth?: number;  // default: 5
    excludeImports?: string[];
  };
  render?: {
    bufferSize?: number;    // default: 50 Samples
    autoStart?: boolean;    // default: false
  };
  memory?: {
    gcDelayMs?: number;     // default: 100
  };
}
```

---

## UI-Design

**Panel-Struktur:** Sub-Tabs (Bundle | Render | Memory) + optionale Toolbar

### Bundle-Tab
- 4-spaltige Hero-Row: Source Size · Gzip Est. · Direct Imports · Tree Depth
- Horizontal-Bars mit Threshold-Markierungen (amber bei warn, rot bei crit)
- Import-Chips (farbig nach Paket-Typ: Angular = violet, RxJS = cyan, lokal = neutral)
- Depth-Gauge: 10 Segmente, Farbe kippt bei Tiefe ≥ 4

### Render-Tab
- Toolbar: ▶ Profile / ⏸ Pause · ✕ Clear · ⚙ Thresholds · Live-Dot + Sample-Count
- Linke Hero-Zahl: Initial-Render in ms (farbcodiert: grün/amber/rot)
- Rechts: 2×2 Stats-Grid (Avg, Slowest, p95, Last)
- **Signature-Element:** SVG-Waveform-Sparkline mit Glow, Threshold-Linien, Ripple-Dot

### Memory-Tab
- Toolbar: ▶ Snapshot · ✕ Clear · ⚙
- 3-spaltige Hero-Row: Before · After Create · After Destroy
- Heap-Bars: gestapelter Vergleich vor/nach/destroy
- Leak-Badge: grün (ok) / amber (warn) / rot (crit)
- Disclaimer: "performance.memory ist Chrome-only"

**Design-Token-Mapping** (folgt `PRISM_DARK_THEME`):

| Zweck        | Token                   | Wert         |
|--------------|-------------------------|--------------|
| OK/grün      | `--perf-ok`             | `#4ade80`    |
| Warn/amber   | `--perf-warn`           | `#fbbf24`    |
| Krit/rot     | `--perf-crit`           | `#f87171`    |
| Trace-Linie  | `--prism-primary`       | `#a78bfa`    |
| Mono-Zahlen  | `--prism-font-mono`     | Cascadia/Fira|

---

## Implementierungs-Phasen

### Phase 1 — Core-Vorbereitung (2–3 Stunden)
- [ ] `PRISM_RENDERER_HOOKS` Token + Interface in Core (`src/app/tokens/`)
- [ ] `performance.mark()` Calls in `PrismRendererComponent` (create + rerender)
- [ ] `BundleMetrics` Interface in `src/builder/scanner/scanner.types.ts`
- [ ] `ScannedComponent.meta.bundle` in `manifest-generator` serialisieren
- [ ] Tests für Manifest-Serialisierung aktualisieren

### Phase 2 — Bundle-Scanner (2–3 Stunden)
- [ ] `packages/plugin-perf/src/bundle/bundle-scanner.ts`
  - `scanBundle(filePath, thresholds): BundleMetrics`
  - Nutzt `zlib.gzip()` (async) + `ts.createSourceFile()`
  - Import-Graph-Traversal (max-depth-aware, rekursiv)
- [ ] Unit-Tests mit Fixture-Dateien (`__fixtures__/`)
- [ ] `onComponentScanned`-Integration in Plugin-Factory

### Phase 3 — Render-Service + Sparkline (3–4 Stunden)
- [ ] `PerfRenderService` mit PerformanceObserver + Signal-State
- [ ] `SparklineComponent` (SVG, pure computed path-strings)
- [ ] `RenderSectionComponent` (Hero + Stats-Grid + Sparkline)
- [ ] Unit-Tests (mock PerformanceObserver)

### Phase 4 — Memory-Service (2 Stunden)
- [ ] `PerfMemoryService` (Snapshots, available-check)
- [ ] `MemorySectionComponent` (Bars + Leak-Badge)
- [ ] Unit-Tests (mock `performance.memory`)

### Phase 5 — Panel-Integration (2 Stunden)
- [ ] `PerfPanelComponent` (Sub-Tabs, Toolbar, Content-Dispatch)
- [ ] Plugin-Factory `perfPlugin()` vollständig
- [ ] `packages/plugin-perf/project.json` für Nx-Build
- [ ] `packages/plugin-perf/package.json` mit peerDeps
- [ ] End-to-End-Test: Plugin in test-workspace verwenden

### Phase 6 — Dokumentation (1 Stunde)
- [ ] `docs/plugin-api.md` — `perfPlugin()` Abschnitt ergänzen
- [ ] `SPEC.md` — offizielles Plugin eintragen
- [ ] `MEMORY.md` aktualisieren

---

## Constraints & Edge Cases

| Problem | Lösung |
|---|---|
| `performance.memory` nicht in Firefox/Safari | `available = computed(() => 'memory' in performance)` → Fallback-State "Not available" |
| `performance.mark` Detail-Objekt: TypeScript 4-Typen fehlen | Cast `as PerformanceMarkOptions` |
| PerformanceObserver feuert nicht sofort (buffered=false) | `observe({ type: 'measure', buffered: true })` bei Start |
| Render-Marks von anderen Komponenten-Wechseln | `detail.selector` in Mark-Options → Filter im Observer |
| Import-Graph-Traversal bei Barrel-Dateien (index.ts) | Barrel-Importe als single node werten (depth +1) |
| `zlib.gzip` async im synchronen onComponentScanned-Hook | Promise.all + async Hook-Support prüfen → evtl. synchrone Schätzung: `sourceSize * 0.31` |
| CD-Runs zählen ohne NgZone-Hack | `PerformanceObserver` auf `prism:rerender` measures = CD-Proxy |

---

## Abgrenzung (nicht in Scope)

- **Flame Graphs** — zu komplex für Phase 1, könnte als separates Chart-Plugin folgen
- **Network-Requests** — gehört zu einem hypothetischen `plugin-network`
- **Bundle-Analyse via Webpack/esbuild** — nur TypeScript-Quellgröße, kein echtes Tree-Shaking
- **Vergleich über Zeit** — kein Persistenz-Layer in Phase 1 (nur Session-State)
- **CI-Integration** — Budget-Checking im Builder ist Folge-Feature

---

## Risiken

| Risiko | Wahrscheinlichkeit | Mitigation |
|---|---|---|
| `performance.memory` GC-Timing unzuverlässig | Hoch | Delay + Disclaimer; als "Schätzung" labeln |
| Import-Graph zu langsam bei großen Libraries | Mittel | Max-Depth + nur relative Imports |
| PerformanceObserver-API in Jest-Umgebung fehlt | Sicher | Mock in Jest-Setup (`jest.fn()`) |
| Angular-Renderer-Marks interferieren mit App-Code | Niedrig | Namespace `prism:` eindeutig |

---

## UI-Prototyp

Interaktiver HTML-Prototyp: `docs/perf-panel-prototype.html`
Alle vier Zustände: Bundle, Render (aktiv), Memory, leer.
