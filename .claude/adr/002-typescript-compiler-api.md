# ADR 002 — TypeScript Compiler API für Komponenten-Scanning

**Status:** Akzeptiert
**Datum:** 2026-02-22

---

## Kontext

Um automatisch Controls und Dokumentation zu generieren, müssen wir
`@Input()`-Properties mit ihren TypeScript-Typen, Default-Werten und JSDoc-Kommentaren
extrahieren — ohne dass der Entwickler sie manuell im `@Showcase`-Decorator beschreiben muss.

## Alternativen betrachtet

| Ansatz | Problem |
|---|---|
| Runtime-Reflection | TypeScript-Typen existieren zur Laufzeit nicht (nur `design:type` Metadata, sehr begrenzt) |
| Angular Compiler | Interne API, nicht stabil zwischen Versionen |
| Compodoc (bestehend) | Externe Abhängigkeit, wir hätten kein Kontrolle |
| Eigener Regex/Parser | Fehleranfällig, kein vollständiges TypeScript-Verständnis |

## Entscheidung

Wir nutzen die offizielle **TypeScript Compiler API** (`ts.createProgram()`)
zur Build-Zeit im Custom Angular Builder.

## Begründung

- **Offizielle, stabile API** — TypeScript garantiert Backward-Compatibility
- **Vollständiges Typ-Verständnis** — Union-Types, Generics, Type-Aliases werden korrekt aufgelöst
- **JSDoc-Zugriff** — `ts.getJSDocTags()`, `symbol.getDocumentationComment()`
- **Keine Laufzeit-Kosten** — läuft nur im Builder, nicht im Browser
- **Compodoc nutzt denselben Ansatz** — praxiserprobt

## Konsequenzen

- Builder-Startup etwas langsamer (TypeScript-Programm muss geparst werden)
  → Acceptable, da einmaliger Build-Step; Incremental-Watch-Mode geplant
- Komplexe generische Typen müssen ggf. vereinfacht dargestellt werden
  → Fallback auf `'unknown'` mit JSON-Textarea-Control
- Test-Aufwand für den Scanner ist höher
  → Eigene Test-Suite mit Fixture-TypeScript-Dateien geplant
