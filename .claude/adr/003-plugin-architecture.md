# ADR 003 — Plugin-Architektur

**Status:** Akzeptiert
**Datum:** 2026-02-22

---

## Kontext

Der Core von ng-prism soll schlank bleiben.
Features wie A11y-Checks, Viewport-Switcher oder Theme-Switcher sollen optional sein.
Gleichzeitig sollen auch Community-Plugins möglich sein.

## Entscheidung

Wir implementieren ein Plugin-System basierend auf dem **Plain-Object-mit-Hooks**-Pattern
(inspiriert von Vite's Plugin-API).

Plugins sind Funktionen die ein `NgPrismPlugin`-Objekt zurückgeben.
Das Objekt hat optionale Hook-Felder für Build-Zeit und Runtime.

```typescript
interface NgPrismPlugin {
  name: string;
  onComponentScanned?: (c: ScannedComponent) => ScannedComponent | void;
  onPageScanned?: (p: StyleguidePage) => StyleguidePage | void;
  onManifestReady?: (m: PrismManifest) => PrismManifest | void;
  panels?: PanelDefinition[];
  controls?: ControlDefinition[];
  wrapComponent?: Type<unknown>;
}
```

## Warum kein Klassen-basiertes System?

- Plain objects sind einfacher zu tippen, testen und serialisieren
- Kein `extends`, keine abstrakten Klassen, kein Framework-Lock-in
- Vite hat gezeigt dass dieses Pattern in der Praxis sehr gut funktioniert

## Warum interne Panels als Plugins?

Controls-Panel und Events-Log werden intern als Plugins implementiert.
Das garantiert:
1. Die Plugin-API ist vollständig und praxistauglich (wir nutzen sie selbst)
2. Nutzer können Built-in-Panels ersetzen (gleiche `panel.id` überschreibt)

## Technische Herausforderung: Build-Zeit vs. Runtime

Plugins haben sowohl Build-Zeit- (Node.js) als auch Runtime-Anteile (Browser).
Der Angular Builder muss die Runtime-Teile (Angular-Komponenten) irgendwie
ins generierte Manifest einbetten.

**Geplante Lösung:** Der Builder schreibt eine `plugin-registry.ts` ins
Styleguide-App-Verzeichnis. Diese Datei importiert die Plugin-Komponenten
und exportiert ein Registry-Objekt das die App zur Laufzeit lädt.

## Konsequenzen

- Plugin-Pakete müssen sowohl Node-kompatiblen Code (Hooks) als auch
  Angular-Komponenten exportieren — erfordert sorgfältige Package-Struktur
- Die Grenze zwischen Build-Zeit und Runtime muss klar dokumentiert sein
- Plugins können die Styleguide-App-Startzeit verlängern wenn sie viele Komponenten laden

## Offene Fragen

- Soll es `enforce: 'pre' | 'post'` geben für Plugin-Reihenfolge?
- Können Plugins andere Plugins deaktivieren?
- Wie wird sichergestellt dass Plugin-Angular-Komponenten zur Styleguide-App-Version kompatibel sind?
