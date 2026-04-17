# ADR 001 — Decorator-basierte Komponenten-Discovery

**Status:** Akzeptiert
**Datum:** 2026-02-22

---

## Kontext

Storybook nutzt separate `.stories.ts`-Dateien. Das führt zu:
- Dupliziertem Kontext (Komponente + Storyfile müssen synchron gehalten werden)
- Breaking Changes bei Major-Updates (Story-Format ändert sich)
- Kognitiver Last für Entwickler (zwei Dateien pro Komponente)

## Entscheidung

Wir nutzen einen `@Showcase`-Decorator direkt auf der Angular-Komponente.
Metadaten werden via `reflect-metadata` gespeichert (`Reflect.defineMetadata`).

```typescript
@Component({ ... })
@Showcase({ title: 'Button', variants: [...] })
export class ButtonComponent { }
```

## Begründung

- **Zero extra files** — die Komponente ist ihre eigene Dokumentation
- **Angular-idiomatic** — Decorators sind das Standard-Pattern in Angular
- **`reflect-metadata` ist bereits vorhanden** — Angular nutzt es intern
- **Kein Bruch bei Angular-Updates** — wir nutzen keine Angular-internen APIs
- **Tree-shakeable** — `@Showcase` kann aus Production-Builds herausgehalten werden
  (der Decorator wird nur im Dev-Build eingebunden)

## Konsequenzen

- Komponenten-Dateien werden leicht größer (Showcase-Konfiguration inline)
- Für sehr komplexe Varianten-Setups kann der Decorator unübersichtlich werden
  → Lösung: Varianten in eine benachbarte `*.showcase.ts` auslagern (optional, per Konvention)
- Production-Build: `@Showcase` muss per Builder/Tree-Shaking entfernt werden
