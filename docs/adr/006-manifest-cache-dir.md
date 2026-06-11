# ADR 006: prism-manifest.ts lebt in `ng-prism-cache/`

**Status:** Accepted
**Date:** 2026-06-10 (Cache-Dir-Lokation), 2026-06-11 (Dotdir-Konflikt mit `@angular/build` entdeckt → `ng-prism-cache/` ohne Dot-Prefix)
**Release:** `@ng-prism/core@22.0.0` (Major Bump aligned mit Angular 22 Release; gleichzeitig wird die peerDependency-Range auf `>=20.0.0` geöffnet — Angular 20, 21 und 22 werden unterstützt.) Rename ohne Dot ab `22.0.0-beta.4`.

## Context

`prism-manifest.ts` ist ein vom Builder generiertes Artifact. Es importiert Komponenten der User-Library, wird von `main.ts` konsumiert und niemals von Nutzern editiert. Bis zu dieser Entscheidung lag es im Source-Tree des Prism-Projekts (`projects/<lib>-prism/src/prism-manifest.ts`) und erforderte einen `.gitignore`-Eintrag. Das war funktional, aber konzeptuell verwirrend: Build-Artifacts gehören nicht in `src/`.

Eine erste Iteration versuchte `node_modules/.cache/ng-prism/<prism-project>/` — scheiterte aber daran, dass esbuild (in `@angular-devkit/build-angular:application`) keine tsconfig-`paths`-Resolution für Files unter `node_modules/` anwendet. Der Manifest importiert die User-Library wiederum über deren path-gemapped Specifier — die Auflösung schlägt fehl, wenn der Manifest in `node_modules/` liegt.

Eine zweite Iteration versuchte den intuitiven Dotdir-Namen `.ng-prism/` (analog `.angular/`, `.nx/`, `.next/`) — funktional korrekt bezüglich Path-Resolution, aber **silently broken bezüglich File-Watching**: `@angular/build`'s watchpack-basierter Watcher hat ein hardcodes Ignore-Pattern `**/.*/**`, das jede Dotdir vom Watch-Set ausschließt (`packages/.../build-action.js`). Der Manifest wird vom ng-prism-Builder zwar regeneriert, esbuild's Bundle-Cache hält aber stale Inhalte — `@Showcase`-Decorator-Edits triggern keinerlei HMR/Reload, selbst Hard-Refresh zeigt das alte Variant-Set, weil esbuild aus dem In-Memory `outputFiles`-Store bedient.

## Decision

Der Builder schreibt das Manifest nach `<workspaceRoot>/ng-prism-cache/<prism-project>/prism-manifest.ts` — **ohne** Dot-Prefix, um nicht in das `**/.*/**`-Ignore-Pattern von `@angular/build` zu fallen. Aufgelöst wird der Import über ein **Wildcard-Path-Mapping** in `tsconfig.json`:

```jsonc
"prism-manifest/*": ["./ng-prism-cache/*/prism-manifest.ts"]
```

`main.ts` jedes Prism-Projekts importiert projektspezifisch:

```ts
import { PRISM_RUNTIME_MANIFEST } from 'prism-manifest/<prism-project>';
```

`.gitignore` erhält einen einzigen, workspace-weiten Eintrag: `ng-prism-cache/`. Builder akzeptieren zusätzlich einen optionalen `cacheDir?`-Override für CI-Sandboxes oder ungewöhnliche Setups.

## Consequences

**Positive:**

- Keine "rote" generierte Datei im Source-Tree / in IDE-File-Listings.
- Workspace-weite `.gitignore`-Zeile statt per-Projekt-Pfade.
- Multi-Project-Workspaces (mehrere Prism-Setups in einer Workspace) sind kollisionsfrei, weil das Wildcard-Mapping pro Projekt auflöst.
- npm-install-stabil — `ng-prism-cache/` wird nicht von `npm install` ge-wiped (anders als die verworfene `node_modules/.cache/`-Variante).
- Funktioniert mit `@angular/build`'s File-Watcher: weil das Dir nicht mit `.` beginnt, fällt es nicht in den Standard-`**/.*/**`-Ignore-Filter. `@Showcase`-Edits triggern HMR/Reload zuverlässig.

**Negative / Trade-offs:**

- Path-Mapping ist eine zusätzliche Indirektion gegenüber relativem Import. Trade: −1 Zeile `.gitignore` und ein verschwundenes Artifact aus `src/`, +1 Zeile `tsconfig.json`.
- `main.ts`-Import enthält den Prism-Projektnamen — das ist explizit, aber bedeutet, dass das Umbenennen eines Prism-Projekts einen `main.ts`-Edit zusätzlich zur `angular.json`-Anpassung verlangt.
- Erstmalige `ng-update`-Infrastruktur war nötig, um existierende Installationen sauber zu migrieren.
- Der Name ist nicht-konventionell (andere Tools nutzen Dotdirs wie `.angular/`, `.nx/`); der Trade-off ist akzeptabel, weil das funktionale HMR-Erlebnis Vorrang hat und der Name explizit namespaced ist (`ng-prism-cache/` vs. generischem `cache/`).

## Alternatives Considered

- **`node_modules/.cache/ng-prism/`** (Issue-Vorschlag): scheiterte am esbuild-tsconfig-paths-Verhalten unter `node_modules/`.
- **`.ng-prism/`** (vorhergehender Stand vor `22.0.0-beta.4`): konventioneller Dotdir-Name, aber von `@angular/build`'s Watcher per `**/.*/**`-Ignore stillschweigend ausgeschlossen → HMR/Reload kaputt für Decorator-Edits. Beim Wechsel zurück auf Dot würde dies wieder auftauchen.
- **`projects/<lib>-prism/src/prism-manifest.ts`** (Status quo vor 22.0.0-beta.0): löst das Kernproblem nicht — Datei taucht weiter als trackbares Artifact im File-Tree auf.
- **Single-Key-Mapping `"prism-manifest"`** (Zwischenstand): kollidiert in Multi-Project-Workspaces, weil alle Projekte denselben tsconfig-Key teilen müssten.
- **Per-`tsconfig.app.json`-Override**: erlaubt Multi-Project, aber TypeScript replaced `paths` beim `extends` statt zu mergen — würde alle übrigen Path-Mappings in jedem App-tsconfig duplizieren. Wildcard-Lösung ist sauberer.

## Related

- Issue [#13](https://github.com/dyingangel666/ng-prism/issues/13)
- Discussion [#5](https://github.com/dyingangel666/ng-prism/discussions/5)
