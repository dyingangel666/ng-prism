# ADR 005 — Plugin-Schematics via gemeinsamer AST-Utility

**Status:** Akzeptiert
**Datum:** 2026-06-01

---

## Kontext

`ng add @ng-prism/core` setzt das Prism-App-Projekt auf, installiert aber keine Runtime-Peer-Dependencies und konfiguriert keine Plugins. Plugins haben gar kein Schematic — User müssen manuell Imports und Factory-Calls in `ng-prism.config.ts` einfügen. Das ist fehleranfällig und hat konkret zu `Cannot find package 'ngx-highlightjs'` zur Laufzeit bei sg-ui-lib geführt.

## Entscheidung

Jedes offizielle Paket (`@ng-prism/core` + 5 Plugins) bekommt ein vollständiges `ng-add`-Schematic. Die Plugin-Schematics teilen sich eine TS-AST-Utility (`addPluginToConfig`), die im Core lebt und über den Subpath-Export `@ng-prism/core/schematics/utils` verfügbar ist.

**Begründung:**
- AST-Manipulation ist robust gegenüber User-Anpassungen an `ng-prism.config.ts` (Variablen, Kommentare, mehrzeilige Arrays)
- Shared Utility verhindert Duplikation in 5 Plugin-Paketen
- Subpath-Export ist Standard-NodeJS-Pattern, kein zusätzliches Bundling nötig

**Plugin-Schematic-Body bleibt minimal** — nur 3 Konstanten (`importName`, `importFrom`, `call`) unterscheiden sich pro Plugin.

## Implementierung

### AST-Utility im Core
- `packages/ng-prism/src/schematics/utils/config-ast.ts` — pure Funktion
- `packages/ng-prism/src/schematics/utils/index.ts` — Re-export
- `packages/ng-prism/package.json`:
  ```json
  "./schematics/utils": {
    "types": "./dist/schematics/utils/index.d.ts",
    "import": "./dist/schematics/utils/index.js",
    "default": "./dist/schematics/utils/index.js"
  }
  ```

### Plugin-Schematic-Body
```typescript
// z.B. @ng-prism/plugin-jsdoc/src/schematics/ng-add/index.ts
const PLUGIN_IMPORT_NAME = 'jsDocPlugin';
const PLUGIN_IMPORT_FROM = '@ng-prism/plugin-jsdoc';
const PLUGIN_CALL = 'jsDocPlugin()';

function injectPlugin(options: NgAddSchemaOptions): Rule {
  return (tree: Tree, context: SchematicContext) => {
    const configPath = options.configPath ?? 'ng-prism.config.ts';
    const changed = addPluginToConfig(tree, configPath, {
      importName: PLUGIN_IMPORT_NAME,
      importFrom: PLUGIN_IMPORT_FROM,
      call: PLUGIN_CALL,
    });
    if (changed) {
      context.logger.info(`  ${PLUGIN_IMPORT_FROM} → added to ${configPath}`);
    } else {
      context.logger.info(`  ${PLUGIN_IMPORT_FROM} already configured — skipped`);
    }
    return tree;
  };
}

export function ngAdd(options: NgAddSchemaOptions): Rule {
  return chain([injectPlugin(options)]);
}
```

### `ng-add` Package-Konfiguration
```json
{
  "ng-add": {
    "save": "devDependencies"
  }
}
```

## Warum nicht Regex?

Regex-basierte String-Manipulation ist zu fragil:
- Kommentare in `ng-prism.config.ts` können Muster zerstören
- Mehrzeilige Arrays brauchen komplexe Backtracking-Logik
- Umformatierung (Tabs vs. Spaces) führt zu Fehlern

AST ist resilient gegenüber all diesen Fällen.

## Warum nicht zentrales Generator-Schematic?

Alternative: `ng g @ng-prism/core:add-plugin --plugin=jsdoc` (statt `ng add @ng-prism/plugin-jsdoc`)

**Nachteile:**
- User würde Standard-Convention verlieren (`ng add` ist das bekannte Pattern)
- Pakete müssen manuell installiert werden (`npm install @ng-prism/plugin-jsdoc --save-dev`)
- Plugin-Discovery (welche Plugins existieren?) wird kompliziert

**Unsere Lösung (ng add pro Plugin):**
- Standard-Pattern für alle
- `npm install` + Schematic in einem Befehl
- `--save-dev` von `package.json` automatisch gesteuert

## Konsequenzen

**Positiv:**
- `ng add @ng-prism/<paket>` reicht für vollständigen Setup
- Idempotent — User kann jederzeit re-runnen
- Build-Fehler bei fehlenden peerDependencies werden sofort sichtbar

**Negativ:**
- Plugin-Schematics haben Build-Time-Abhängigkeit auf Core (kompilierte Utility unter `@ng-prism/core/schematics/utils`). Ein Plugin kann ohne installiertes Core nicht hinzugefügt werden — was OK ist, weil Core ohnehin peerDependency ist.
- Versionierung: Bei Breaking Changes der Utility müssen alle Plugins gleichzeitig released werden. Da alle Plugins ohnehin Version-aligned sind (`21.x` Beta-Linie), ist das im Workflow kein Mehraufwand.

