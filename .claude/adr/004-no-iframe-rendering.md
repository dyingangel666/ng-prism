# ADR 004 — Kein iframe für Component-Rendering

**Status:** Akzeptiert
**Datum:** 2026-02-22

---

## Kontext

Storybook rendert Komponenten in einem `<iframe>` um Style-Isolation zu erreichen.
Das hat jedoch direkte Konsequenzen für Komponenten die mit dem `document.body`
interagieren (Dialoge, Overlays, Tooltips, Snackbars etc.).

## Entscheidung

Komponenten werden **direkt im DOM der Styleguide-App** gerendert — kein `<iframe>`.
`NgComponentOutlet` wird direkt in der Shell-Seite verwendet.

## Begründung

**Overlays und Dialoge funktionieren out of the box:**
Angular CDK, `MatDialog`, `MatSnackBar`, `Overlay` etc. öffnen ihre Portale
im `document.body`. Da die Styleguide-App eine vollständige Angular-App ist,
sind diese Services im richtigen Kontext verfügbar und funktionieren identisch
zu einer echten Anwendung.

**Echtes Verhalten, kein Mockup:**
Was im Styleguide gezeigt wird, verhält sich exakt wie in Production.
Das ist ein explizites Qualitätsmerkmal gegenüber Storybook.

**Kein Overhead:**
`<iframe>` erfordert Cross-Frame-Kommunikation für Controls, Events und
Plugin-Panels. Das wäre erhebliche Komplexität ohne Mehrwert.

## Konsequenzen

**Positiv:**
- Dialoge, Overlays, Tooltips, BottomSheets — alles funktioniert sofort
- Keine Cross-Frame-Kommunikation nötig
- Controls-Panel kann direkt mit der gerenderten Komponente kommunizieren
- Plugins können das DOM der Komponente direkt inspizieren (z.B. für A11y-Checks)

**Negativ / zu beachten:**
- Keine Style-Isolation: Globale CSS-Styles der Styleguide-App können
  die Komponente beeinflussen → Styleguide-App muss minimal gestylt sein,
  Komponenten-Styles werden via Shadow DOM oder scoped styles isoliert
- Komponenten können theoretisch das Styleguide-UI beeinflussen
  → Akzeptiertes Risiko; Namenskonventionen und Scoping mindern das

## Viewport-Simulation

Da kein iframe existiert, wird Viewport-Simulation anders gelöst:
- Der Component-Container bekommt eine feste Breite (CSS `max-width` / `resize`)
- Media-Queries der Komponente reagieren darauf nicht (ein bekanntes Limit)
- Echte Viewport-Tests bleiben Aufgabe der E2E-Tests

## Providers für Overlay-Komponenten

Drei Ebenen für Service-Konfiguration (von global zu lokal):

1. **`defineConfig.appProviders`** — Library-weite Providers beim App-Bootstrap
2. **`@Showcase({ providers })`** — Komponenten-spezifischer Kind-Injector
3. **Plugin `wrapComponent`** — Angular-Wrapper-Komponente für Kontext-Injection
