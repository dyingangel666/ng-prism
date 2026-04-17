# Design: @ng-prism/plugin-box-model

**Date:** 2026-03-07
**Status:** Approved

## Übersicht

Neues offizielles Plugin `@ng-prism/plugin-box-model` — hover-basierte Box-Model-Visualisierung direkt im Render-Canvas, ähnlich dem Storybook Measure Addon.

Das Plugin zeigt beim Hovern über Elemente im Canvas deren Margin/Border/Padding/Content-Boxen als farbige Overlays an. Die Visualisierung erscheint im Render-Bereich oben, sobald der Box-Model-Tab unten aktiv ist.

---

## Core-Erweiterung

### 1. Neuer `PrismPanelService`

**Datei:** `packages/ng-prism/src/app/services/prism-panel.service.ts`

```typescript
@Injectable({ providedIn: 'root' })
export class PrismPanelService {
  readonly activePanelId = signal<string>('controls');
}
```

`PrismPanelHostComponent` migriert `activePanelId` von lokalem Signal zu diesem Service.

### 2. `PanelDefinition` Extension

**Datei:** `packages/ng-prism/src/plugin/plugin.types.ts`

```typescript
interface PanelDefinition {
  id: string;
  label: string;
  component?: Type<unknown>;
  loadComponent?: () => Promise<Type<unknown>>;
  overlayComponent?: Type<unknown>;
  loadOverlayComponent?: () => Promise<Type<unknown>>;
  icon?: string;
  position?: 'bottom' | 'right';
}
```

### 3. `PrismRendererComponent` — Overlay-Rendering

Der Canvas bekommt `position: relative` und rendert das aktive Overlay-Component via `NgComponentOutlet`:

```html
<div class="prism-renderer__canvas">
  <ng-container #outlet />
  @if (activeOverlay()) {
    <ng-container *ngComponentOutlet="activeOverlay()" />
  }
</div>
```

`activeOverlay()` ist ein computed Signal:
1. Liest `PrismPanelService.activePanelId`
2. Sucht das Panel in `PrismPluginService` (built-in + plugin panels)
3. Gibt `overlayComponent` zurück (lazy: analog zum bestehenden lazy-Cache im Panel-Host)

---

## Plugin-Struktur

```
packages/plugin-box-model/
├── src/
│   ├── box-model-plugin.ts            # Factory: boxModelPlugin()
│   ├── box-model-overlay.component.ts # Render-Area-Overlay (hover + Farbboxen)
│   ├── box-model-panel.component.ts   # Bottom-Tab: Messwert-Diagramm
│   ├── box-model-state.service.ts     # Shared Signal: hoveredBoxModel
│   ├── box-model-utils.ts             # getBoxModel(element) → pure Funktion
│   ├── box-model.types.ts             # BoxModelData Interface
│   └── index.ts
├── package.json                       # name: @ng-prism/plugin-box-model
├── project.json
└── tsconfig.json
```

### Plugin-Factory

```typescript
export function boxModelPlugin(): NgPrismPlugin {
  return {
    name: 'box-model',
    panels: [{
      id: 'box-model',
      label: 'Box Model',
      loadComponent: () => import('./box-model-panel.component.js')
        .then(m => m.BoxModelPanelComponent),
      loadOverlayComponent: () => import('./box-model-overlay.component.js')
        .then(m => m.BoxModelOverlayComponent),
    }],
  };
}
```

Kein Build-Time-Hook — rein runtime.

---

## Box Model Overlay

### Positionierung

```css
position: absolute;
inset: 0;
pointer-events: none;
overflow: hidden;
```

`pointer-events: none` lässt Klicks/Hover zur gerenderten Komponente durch.

### Hover-Mechanismus

1. `mousemove`-Listener auf `.prism-renderer__canvas` via `fromEvent()` + `takeUntilDestroyed()`
2. `document.elementFromPoint(x, y)` findet das Element unter dem Cursor (funktioniert durch `pointer-events: none` hindurch)
3. Prüfung ob Element im Subtree von `PrismRendererService.renderedElement()` liegt
4. Kein gültiges Element → Overlay leer

### Datenmodell

**`BoxModelData`** (`box-model.types.ts`):

```typescript
interface BoxSides {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

interface BoxModelData {
  element: Element;
  content: DOMRect;
  padding: BoxSides;
  border: BoxSides;
  margin: BoxSides;
}
```

**`getBoxModel(element)`** (`box-model-utils.ts`):
- `getBoundingClientRect()` für Position und Content-Größe
- `getComputedStyle()` für Padding, Border, Margin (parseFloat)
- Pure Funktion, kein Angular

### Visualisierung

Vier überlagerte `<div>`s, jeweils `position: absolute`, berechnet relativ zum Canvas-Element:

| Box | Farbe | Alpha |
|-----|-------|-------|
| Margin | `#f59e0b` (amber) | 30% |
| Border | `#eab308` (gelb) | 60% |
| Padding | `#10b981` (grün) | 30% |
| Content | `#3b82f6` (blau) | 30% |

Pixel-Labels (z.B. `8px`) direkt auf die Kanten geschrieben — `0`-Werte werden nicht angezeigt.

---

## Bottom Panel

**`BoxModelPanelComponent`** zeigt ein DevTools-ähnliches Kasten-Diagramm:

```
┌─────────────────────────────────┐
│  margin                         │
│  ┌───────────────────────────┐  │
│  │  border                   │  │
│  │  ┌─────────────────────┐  │  │
│  │  │  padding             │  │  │
│  │  │  ┌───────────────┐   │  │  │
│  │  │  │  200 × 48     │   │  │  │
│  │  │  └───────────────┘   │  │  │
│  │  └─────────────────────┘  │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

- Alle 4 Seiten pro Box (top/right/bottom/left) als Werte eingeblendet
- `0`-Werte ausgegraut, Non-zero-Werte hervorgehoben
- Kein Element gehovert → Placeholder: *"Hover over an element to inspect its box model"*

### Kommunikation Overlay ↔ Panel

Gemeinsamer **`BoxModelStateService`** (`providedIn: 'root'`):

```typescript
@Injectable({ providedIn: 'root' })
export class BoxModelStateService {
  readonly hoveredBoxModel = signal<BoxModelData | null>(null);
}
```

- Overlay schreibt `hoveredBoxModel`
- Panel liest `hoveredBoxModel`

---

## Kein `@Showcase`-Konfigurationspunkt

Das Plugin benötigt keine `@Showcase({ meta: { boxModel: ... } })`-Konfiguration — es funktioniert für jede Komponente out-of-the-box.

---

## Tests

| Datei | Testinhalt |
|-------|------------|
| `box-model-utils.spec.ts` | `getBoxModel()` mit gemocktem `getComputedStyle` / `getBoundingClientRect` |
| `box-model-plugin.spec.ts` | Plugin-Factory gibt korrekte `PanelDefinition` zurück |
| `prism-panel.service.spec.ts` | Service-Signal-Verhalten |
| `prism-renderer.component.spec.ts` | Overlay wird bei aktivem Panel gerendert |

---

## Abhängigkeiten

- peerDependencies: `ng-prism`, `@angular/core`, `rxjs`
- Keine externen Libraries nötig (alles via DOM APIs)
