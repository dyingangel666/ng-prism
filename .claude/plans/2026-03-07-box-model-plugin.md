# Box Model Plugin Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build `@ng-prism/plugin-box-model` — a hover-based CSS box model inspector that renders colored overlays in the component canvas when its panel tab is active.

**Architecture:** Extend `PanelDefinition` with `overlayComponent`/`loadOverlayComponent` fields. A new `PrismPanelService` tracks the active panel ID globally so `PrismRendererComponent` can render the correct overlay. The plugin contributes one panel + one overlay; the overlay uses `mousemove` + `elementFromPoint()` to detect hovered elements and writes `BoxModelData` to a shared `BoxModelStateService` which the bottom panel reads.

**Tech Stack:** Angular 21 standalone components, RxJS `fromEvent` + `takeUntilDestroyed`, DOM `getBoundingClientRect` + `getComputedStyle`, TypeScript Compiler (`ngc`), Jest 30 + SWC.

---

## Phase 1: Core Extension (ng-prism)

### Task 1: Create `PrismPanelService`

**Files:**
- Create: `packages/ng-prism/src/app/services/prism-panel.service.ts`
- Create: `packages/ng-prism/src/app/services/prism-panel.service.spec.ts`

**Step 1: Write the failing test**

```typescript
// packages/ng-prism/src/app/services/prism-panel.service.spec.ts
import { PrismPanelService } from './prism-panel.service.js';

describe('PrismPanelService', () => {
  let service: PrismPanelService;

  beforeEach(() => {
    service = new PrismPanelService();
  });

  it('defaults activePanelId to "controls"', () => {
    expect(service.activePanelId()).toBe('controls');
  });

  it('updates activePanelId when set', () => {
    service.activePanelId.set('box-model');
    expect(service.activePanelId()).toBe('box-model');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npx nx test ng-prism -- --testPathPatterns=prism-panel.service
```

Expected: FAIL — `Cannot find module './prism-panel.service.js'`

**Step 3: Implement**

```typescript
// packages/ng-prism/src/app/services/prism-panel.service.ts
import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class PrismPanelService {
  readonly activePanelId = signal<string>('controls');
}
```

**Step 4: Run test to verify it passes**

```bash
npx nx test ng-prism -- --testPathPatterns=prism-panel.service
```

Expected: PASS (2 tests)

**Step 5: Commit**

```bash
git add packages/ng-prism/src/app/services/prism-panel.service.ts \
        packages/ng-prism/src/app/services/prism-panel.service.spec.ts
git commit -m "feat(ng-prism): add PrismPanelService for global active-panel tracking"
```

---

### Task 2: Extend `PanelDefinition` with overlay fields

**Files:**
- Modify: `packages/ng-prism/src/plugin/plugin.types.ts`

No tests needed — TypeScript-only change.

**Step 1: Add fields to `PanelDefinition`**

Find the `PanelDefinition` interface and add two optional fields after `loadComponent`:

```typescript
export interface PanelDefinition {
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

**Step 2: Commit**

```bash
git add packages/ng-prism/src/plugin/plugin.types.ts
git commit -m "feat(ng-prism): extend PanelDefinition with overlayComponent/loadOverlayComponent"
```

---

### Task 3: Migrate `PrismPanelHostComponent` to `PrismPanelService`

**Files:**
- Modify: `packages/ng-prism/src/app/panels/panel-host/prism-panel-host.component.ts`

**Step 1: Replace local signal with service injection**

In `PrismPanelHostComponent`:

1. Add import: `import { PrismPanelService } from '../../services/prism-panel.service.js';`
2. Remove the line: `protected readonly activePanelId = signal('controls');`
3. Add injection: `protected readonly panelService = inject(PrismPanelService);`
4. In the effect, replace `this.activePanelId()` with `this.panelService.activePanelId()`
5. In the template, replace `activePanelId()` with `panelService.activePanelId()` and `activePanelId.set(panel.id)` with `panelService.activePanelId.set(panel.id)`

The effect becomes:
```typescript
effect(() => {
  const panel = this.allPanels().find((p) => p.id === this.panelService.activePanelId()) ?? null;
  // ... rest unchanged
});
```

The template tab button:
```html
<button
  class="prism-panel-host__tab"
  [class.prism-panel-host__tab--active]="panelService.activePanelId() === panel.id"
  (click)="panelService.activePanelId.set(panel.id)"
>
  {{ panel.label }}
</button>
```

**Step 2: Build to verify no type errors**

```bash
npx nx build ng-prism
```

Expected: Build succeeds with no errors.

**Step 3: Commit**

```bash
git add packages/ng-prism/src/app/panels/panel-host/prism-panel-host.component.ts
git commit -m "refactor(ng-prism): migrate activePanelId from local signal to PrismPanelService"
```

---

### Task 4: Render overlay in `PrismRendererComponent`

**Files:**
- Modify: `packages/ng-prism/src/app/renderer/prism-renderer.component.ts`

**Step 1: Add overlay logic**

1. Add imports:
```typescript
import { NgComponentOutlet } from '@angular/common';
import { PrismPanelService } from '../services/prism-panel.service.js';
import { PrismPluginService } from '../services/prism-plugin.service.js';
```

2. Add `NgComponentOutlet` to the `imports` array in `@Component`.

3. Add private fields after `private componentRef`:
```typescript
private readonly panelService = inject(PrismPanelService);
private readonly pluginService = inject(PrismPluginService);
private readonly overlayCache = new Map<string, Type<unknown>>();
readonly activeOverlay = signal<Type<unknown> | null>(null);
```

4. Add this effect in the constructor (after the existing effects):
```typescript
effect(() => {
  const panelId = this.panelService.activePanelId();
  const panel = this.pluginService.panels().find((p) => p.id === panelId) ?? null;

  if (!panel) {
    this.activeOverlay.set(null);
    return;
  }

  if (panel.overlayComponent) {
    this.activeOverlay.set(panel.overlayComponent);
    return;
  }

  if (panel.loadOverlayComponent) {
    const cached = this.overlayCache.get(panel.id);
    if (cached) {
      this.activeOverlay.set(cached);
      return;
    }
    this.activeOverlay.set(null);
    panel.loadOverlayComponent().then((comp) => {
      this.overlayCache.set(panel.id, comp);
      this.activeOverlay.set(comp);
    });
    return;
  }

  this.activeOverlay.set(null);
});
```

5. In the template, update the canvas `<div>` to add overlay rendering:

```html
<div class="prism-renderer__canvas">
  <ng-container #outlet />
  @if (activeOverlay()) {
    <ng-container *ngComponentOutlet="activeOverlay()!" />
  }
</div>
```

6. In the styles, add `position: relative` to `.prism-renderer__canvas`:

```css
.prism-renderer__canvas {
  position: relative;
  flex: 1;
  padding: 48px 40px;
  /* ... rest unchanged ... */
}
```

**Step 2: Build to verify**

```bash
npx nx build ng-prism
```

Expected: Build succeeds.

**Step 3: Run all core tests**

```bash
npx nx test ng-prism
```

Expected: All tests pass.

**Step 4: Commit**

```bash
git add packages/ng-prism/src/app/renderer/prism-renderer.component.ts
git commit -m "feat(ng-prism): render panel overlay in renderer canvas when panel has overlayComponent"
```

---

## Phase 2: Plugin Package Scaffold

### Task 5: Create package files for `plugin-box-model`

**Files to create:**
- `packages/plugin-box-model/package.json`
- `packages/plugin-box-model/project.json`
- `packages/plugin-box-model/tsconfig.lib.json`
- `packages/plugin-box-model/jest.config.cts`
- `packages/plugin-box-model/.spec.swcrc`
- `packages/plugin-box-model/src/test-setup.ts`

**Step 1: `package.json`**

```json
{
  "name": "@ng-prism/plugin-box-model",
  "version": "21.0.0",
  "description": "CSS box model inspector for ng-prism.",
  "keywords": ["ng-prism", "box-model", "inspector", "plugin", "angular", "styleguide"],
  "license": "MIT",
  "type": "module",
  "main": "./dist/index.js",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    "./package.json": "./package.json",
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "default": "./dist/index.js"
    }
  },
  "files": ["dist", "!**/*.tsbuildinfo"],
  "peerDependencies": {
    "ng-prism": ">=21.0.0",
    "@angular/core": ">=20.0.0",
    "rxjs": ">=7.0.0"
  },
  "devDependencies": {
    "ng-prism": "*"
  },
  "dependencies": {
    "tslib": "^2.3.0"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/USERNAME/ng-prism.git",
    "directory": "packages/plugin-box-model"
  }
}
```

**Step 2: `project.json`**

```json
{
  "name": "plugin-box-model",
  "targets": {
    "build": {
      "executor": "nx:run-commands",
      "dependsOn": ["ng-prism:build"],
      "options": {
        "command": "node_modules/.bin/ngc --project packages/plugin-box-model/tsconfig.lib.json"
      },
      "inputs": ["production", "^production"],
      "outputs": ["{projectRoot}/dist"]
    },
    "test": {
      "executor": "nx:run-commands",
      "options": {
        "command": "node_modules/.bin/jest --config packages/plugin-box-model/jest.config.cts"
      }
    }
  }
}
```

**Step 3: `tsconfig.lib.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "baseUrl": ".",
    "rootDir": "src",
    "outDir": "dist",
    "tsBuildInfoFile": "dist/tsconfig.lib.tsbuildinfo",
    "emitDeclarationOnly": false,
    "forceConsistentCasingInFileNames": true,
    "types": ["node"],
    "paths": {
      "ng-prism": ["../ng-prism/dist/index.d.ts"],
      "ng-prism/*": ["../ng-prism/dist/*/index.d.ts"]
    }
  },
  "angularCompilerOptions": {
    "compilationMode": "full"
  },
  "include": ["src/**/*.ts"],
  "exclude": [
    "jest.config.ts",
    "jest.config.cts",
    "src/**/*.spec.ts",
    "src/**/*.test.ts",
    "src/**/__fixtures__/**",
    "src/test-setup.ts"
  ]
}
```

**Step 4: `jest.config.cts`** — copy from `plugin-a11y`, change `displayName`:

```javascript
/* eslint-disable */
const { readFileSync } = require('fs');

const swcJestConfig = JSON.parse(
  readFileSync(`${__dirname}/.spec.swcrc`, 'utf-8')
);
swcJestConfig.swcrc = false;

module.exports = {
  displayName: 'plugin-box-model',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/src/test-setup.ts'],
  transform: {
    '^.+\\.[mc]?[tj]s$': ['@swc/jest', swcJestConfig],
  },
  transformIgnorePatterns: ['node_modules/(?!.*\\.mjs$|@angular)'],
  moduleFileExtensions: ['ts', 'js', 'mjs', 'html'],
  coverageDirectory: 'test-output/jest/coverage',
};
```

**Step 5: `.spec.swcrc`** — copy exactly from `plugin-a11y/.spec.swcrc`:

```json
{
  "jsc": {
    "target": "es2017",
    "parser": {
      "syntax": "typescript",
      "decorators": true,
      "dynamicImport": true
    },
    "transform": {
      "decoratorMetadata": true,
      "legacyDecorator": true
    },
    "keepClassNames": true,
    "externalHelpers": true,
    "loose": true
  },
  "module": {
    "type": "es6"
  },
  "sourceMaps": true,
  "exclude": []
}
```

**Step 6: `src/test-setup.ts`**

```typescript
import '@angular/compiler';
```

**Step 7: Register package in `nx.json` / workspace**

```bash
npm install
```

This links the workspace package so `ng-prism` resolves from dist.

**Step 8: Commit scaffold**

```bash
git add packages/plugin-box-model/
git commit -m "feat(plugin-box-model): scaffold package structure"
```

---

## Phase 3: Plugin Implementation

### Task 6: Types

**File:** `packages/plugin-box-model/src/box-model.types.ts`

```typescript
export interface BoxSides {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface BoxModelData {
  element: Element;
  content: DOMRect;
  padding: BoxSides;
  border: BoxSides;
  margin: BoxSides;
}
```

No test needed — types only.

**Commit:**
```bash
git add packages/plugin-box-model/src/box-model.types.ts
git commit -m "feat(plugin-box-model): add BoxModelData types"
```

---

### Task 7: Implement `box-model-utils.ts` (TDD)

**Files:**
- Create: `packages/plugin-box-model/src/box-model-utils.ts`
- Create: `packages/plugin-box-model/src/box-model-utils.spec.ts`

**Step 1: Write the failing tests**

```typescript
// packages/plugin-box-model/src/box-model-utils.spec.ts
import { getBoxModel } from './box-model-utils.js';
import type { BoxModelData } from './box-model.types.js';

function makeElement(
  rectOverrides: Partial<DOMRect> = {},
  styleOverrides: Record<string, string> = {},
): Element {
  const el = {
    getBoundingClientRect: () => ({
      top: 100,
      left: 50,
      width: 200,
      height: 80,
      right: 250,
      bottom: 180,
      x: 50,
      y: 100,
      toJSON: () => ({}),
      ...rectOverrides,
    }),
  } as unknown as Element;

  const defaultStyle: Record<string, string> = {
    'padding-top': '8px',
    'padding-right': '16px',
    'padding-bottom': '8px',
    'padding-left': '16px',
    'border-top-width': '1px',
    'border-right-width': '1px',
    'border-bottom-width': '1px',
    'border-left-width': '1px',
    'margin-top': '4px',
    'margin-right': '0px',
    'margin-bottom': '4px',
    'margin-left': '0px',
    ...styleOverrides,
  };

  jest.spyOn(window, 'getComputedStyle').mockReturnValue({
    getPropertyValue: (prop: string) => defaultStyle[prop] ?? '0px',
  } as unknown as CSSStyleDeclaration);

  return el;
}

describe('getBoxModel', () => {
  afterEach(() => jest.restoreAllMocks());

  it('returns the content DOMRect from getBoundingClientRect', () => {
    const el = makeElement({ width: 200, height: 80 });
    const result = getBoxModel(el);
    expect(result.content.width).toBe(200);
    expect(result.content.height).toBe(80);
  });

  it('parses padding from computed style', () => {
    const el = makeElement({}, {
      'padding-top': '10px',
      'padding-right': '20px',
      'padding-bottom': '10px',
      'padding-left': '20px',
    });
    const result = getBoxModel(el);
    expect(result.padding).toEqual({ top: 10, right: 20, bottom: 10, left: 20 });
  });

  it('parses border-width from computed style', () => {
    const el = makeElement({}, {
      'border-top-width': '2px',
      'border-right-width': '4px',
      'border-bottom-width': '2px',
      'border-left-width': '4px',
    });
    const result = getBoxModel(el);
    expect(result.border).toEqual({ top: 2, right: 4, bottom: 2, left: 4 });
  });

  it('parses margin from computed style', () => {
    const el = makeElement({}, {
      'margin-top': '16px',
      'margin-right': '8px',
      'margin-bottom': '16px',
      'margin-left': '8px',
    });
    const result = getBoxModel(el);
    expect(result.margin).toEqual({ top: 16, right: 8, bottom: 16, left: 8 });
  });

  it('returns 0 for properties not set', () => {
    const el = makeElement({}, {
      'padding-top': '0px',
      'padding-right': '0px',
      'padding-bottom': '0px',
      'padding-left': '0px',
      'border-top-width': '0px',
      'border-right-width': '0px',
      'border-bottom-width': '0px',
      'border-left-width': '0px',
      'margin-top': '0px',
      'margin-right': '0px',
      'margin-bottom': '0px',
      'margin-left': '0px',
    });
    const result = getBoxModel(el);
    expect(result.padding).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
    expect(result.border).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
    expect(result.margin).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
  });

  it('returns the element reference', () => {
    const el = makeElement();
    const result = getBoxModel(el);
    expect(result.element).toBe(el);
  });
});
```

**Step 2: Run to verify they fail**

```bash
npx nx test plugin-box-model -- --testPathPatterns=box-model-utils
```

Expected: FAIL — `Cannot find module './box-model-utils.js'`

**Step 3: Implement**

```typescript
// packages/plugin-box-model/src/box-model-utils.ts
import type { BoxModelData, BoxSides } from './box-model.types.js';

function parseSides(
  style: CSSStyleDeclaration,
  props: [string, string, string, string],
): BoxSides {
  return {
    top: parseFloat(style.getPropertyValue(props[0])) || 0,
    right: parseFloat(style.getPropertyValue(props[1])) || 0,
    bottom: parseFloat(style.getPropertyValue(props[2])) || 0,
    left: parseFloat(style.getPropertyValue(props[3])) || 0,
  };
}

export function getBoxModel(element: Element): BoxModelData {
  const style = window.getComputedStyle(element);
  return {
    element,
    content: element.getBoundingClientRect(),
    padding: parseSides(style, ['padding-top', 'padding-right', 'padding-bottom', 'padding-left']),
    border: parseSides(style, ['border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width']),
    margin: parseSides(style, ['margin-top', 'margin-right', 'margin-bottom', 'margin-left']),
  };
}
```

**Step 4: Run to verify they pass**

```bash
npx nx test plugin-box-model -- --testPathPatterns=box-model-utils
```

Expected: PASS (5 tests)

**Step 5: Commit**

```bash
git add packages/plugin-box-model/src/box-model-utils.ts \
        packages/plugin-box-model/src/box-model-utils.spec.ts
git commit -m "feat(plugin-box-model): implement getBoxModel utility (TDD)"
```

---

### Task 8: `BoxModelStateService`

**File:** `packages/plugin-box-model/src/box-model-state.service.ts`

```typescript
import { Injectable, signal } from '@angular/core';
import type { BoxModelData } from './box-model.types.js';

@Injectable({ providedIn: 'root' })
export class BoxModelStateService {
  readonly hoveredBoxModel = signal<BoxModelData | null>(null);
}
```

No dedicated test — it's a one-liner signal container, covered by integration through the overlay and panel tests.

**Commit:**
```bash
git add packages/plugin-box-model/src/box-model-state.service.ts
git commit -m "feat(plugin-box-model): add BoxModelStateService"
```

---

### Task 9: `BoxModelOverlayComponent`

**File:** `packages/plugin-box-model/src/box-model-overlay.component.ts`

This component:
- Is positioned `absolute; inset: 0; pointer-events: none` inside the canvas
- Attaches a `mousemove` listener to its parent (the canvas) via `fromEvent`
- Uses `document.elementFromPoint()` to find hovered elements
- Computes colored box positions from `BoxModelStateService.hoveredBoxModel()`
- Writes hovered box data to `BoxModelStateService`

```typescript
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent } from 'rxjs';
import { PrismRendererService } from 'ng-prism';
import { getBoxModel } from './box-model-utils.js';
import { BoxModelStateService } from './box-model-state.service.js';

interface BoxStyle {
  left: string;
  top: string;
  width: string;
  height: string;
}

interface BoxStyles {
  margin: BoxStyle;
  border: BoxStyle;
  padding: BoxStyle;
  content: BoxStyle;
}

@Component({
  selector: 'prism-box-model-overlay',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (boxStyles(); as styles) {
      <div class="prism-bm__box prism-bm__box--margin" [style.left]="styles.margin.left" [style.top]="styles.margin.top" [style.width]="styles.margin.width" [style.height]="styles.margin.height">
        <span class="prism-bm__label prism-bm__label--top">{{ labelMargin('top') }}</span>
        <span class="prism-bm__label prism-bm__label--right">{{ labelMargin('right') }}</span>
        <span class="prism-bm__label prism-bm__label--bottom">{{ labelMargin('bottom') }}</span>
        <span class="prism-bm__label prism-bm__label--left">{{ labelMargin('left') }}</span>
      </div>
      <div class="prism-bm__box prism-bm__box--border" [style.left]="styles.border.left" [style.top]="styles.border.top" [style.width]="styles.border.width" [style.height]="styles.border.height"></div>
      <div class="prism-bm__box prism-bm__box--padding" [style.left]="styles.padding.left" [style.top]="styles.padding.top" [style.width]="styles.padding.width" [style.height]="styles.padding.height">
        <span class="prism-bm__label prism-bm__label--top">{{ labelPadding('top') }}</span>
        <span class="prism-bm__label prism-bm__label--right">{{ labelPadding('right') }}</span>
        <span class="prism-bm__label prism-bm__label--bottom">{{ labelPadding('bottom') }}</span>
        <span class="prism-bm__label prism-bm__label--left">{{ labelPadding('left') }}</span>
      </div>
      <div class="prism-bm__box prism-bm__box--content" [style.left]="styles.content.left" [style.top]="styles.content.top" [style.width]="styles.content.width" [style.height]="styles.content.height">
        <span class="prism-bm__size">{{ contentSize() }}</span>
      </div>
    }
  `,
  styles: `
    :host {
      position: absolute;
      inset: 0;
      pointer-events: none;
      overflow: hidden;
    }
    .prism-bm__box {
      position: absolute;
      box-sizing: border-box;
    }
    .prism-bm__box--margin  { background: rgba(245, 158, 11, 0.2); outline: 1px solid rgba(245, 158, 11, 0.5); }
    .prism-bm__box--border  { background: rgba(234, 179, 8, 0.3); }
    .prism-bm__box--padding { background: rgba(16, 185, 129, 0.2); outline: 1px solid rgba(16, 185, 129, 0.4); }
    .prism-bm__box--content { background: rgba(59, 130, 246, 0.25); display: flex; align-items: center; justify-content: center; }
    .prism-bm__label {
      position: absolute;
      font-size: 10px;
      font-family: monospace;
      color: #1f2937;
      background: rgba(255,255,255,0.8);
      padding: 0 3px;
      border-radius: 2px;
      white-space: nowrap;
      line-height: 1.4;
    }
    .prism-bm__label--top    { top: 2px; left: 50%; transform: translateX(-50%); }
    .prism-bm__label--bottom { bottom: 2px; left: 50%; transform: translateX(-50%); }
    .prism-bm__label--left   { left: 2px; top: 50%; transform: translateY(-50%); }
    .prism-bm__label--right  { right: 2px; top: 50%; transform: translateY(-50%); }
    .prism-bm__size {
      font-size: 11px;
      font-family: monospace;
      color: #1e3a5f;
      background: rgba(255,255,255,0.85);
      padding: 1px 5px;
      border-radius: 3px;
      white-space: nowrap;
    }
  `,
})
export class BoxModelOverlayComponent {
  private readonly el = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);
  private readonly rendererService = inject(PrismRendererService);
  private readonly stateService = inject(BoxModelStateService);

  readonly boxStyles = computed<BoxStyles | null>(() => {
    const bm = this.stateService.hoveredBoxModel();
    const canvas = this.el.nativeElement.parentElement;
    if (!bm || !canvas) return null;

    const canvasRect = canvas.getBoundingClientRect();
    const sl = canvas.scrollLeft;
    const st = canvas.scrollTop;
    const { content, padding, border, margin } = bm;

    const bLeft = content.left - canvasRect.left + sl;
    const bTop = content.top - canvasRect.top + st;
    const bW = content.width;
    const bH = content.height;

    return {
      margin: {
        left: `${bLeft - margin.left}px`,
        top: `${bTop - margin.top}px`,
        width: `${bW + margin.left + margin.right}px`,
        height: `${bH + margin.top + margin.bottom}px`,
      },
      border: {
        left: `${bLeft}px`,
        top: `${bTop}px`,
        width: `${bW}px`,
        height: `${bH}px`,
      },
      padding: {
        left: `${bLeft + border.left}px`,
        top: `${bTop + border.top}px`,
        width: `${bW - border.left - border.right}px`,
        height: `${bH - border.top - border.bottom}px`,
      },
      content: {
        left: `${bLeft + border.left + padding.left}px`,
        top: `${bTop + border.top + padding.top}px`,
        width: `${bW - border.left - border.right - padding.left - padding.right}px`,
        height: `${bH - border.top - border.bottom - padding.top - padding.bottom}px`,
      },
    };
  });

  readonly contentSize = computed(() => {
    const bm = this.stateService.hoveredBoxModel();
    if (!bm) return '';
    const { content, border, padding } = bm;
    const w = Math.round(content.width - border.left - border.right - padding.left - padding.right);
    const h = Math.round(content.height - border.top - border.bottom - padding.top - padding.bottom);
    return `${w} × ${h}`;
  });

  labelMargin(side: 'top' | 'right' | 'bottom' | 'left'): string {
    const bm = this.stateService.hoveredBoxModel();
    if (!bm) return '';
    const v = bm.margin[side];
    return v === 0 ? '' : `${v}px`;
  }

  labelPadding(side: 'top' | 'right' | 'bottom' | 'left'): string {
    const bm = this.stateService.hoveredBoxModel();
    if (!bm) return '';
    const v = bm.padding[side];
    return v === 0 ? '' : `${v}px`;
  }

  constructor() {
    afterNextRender(() => {
      const canvas = this.el.nativeElement.parentElement;
      if (!canvas) return;

      fromEvent<MouseEvent>(canvas, 'mousemove')
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((event) => this.handleMouseMove(event));

      fromEvent(canvas, 'mouseleave')
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => this.stateService.hoveredBoxModel.set(null));
    });
  }

  private handleMouseMove(event: MouseEvent): void {
    const renderedEl = this.rendererService.renderedElement();
    if (!renderedEl) {
      this.stateService.hoveredBoxModel.set(null);
      return;
    }

    const element = document.elementFromPoint(event.clientX, event.clientY);
    if (!element || !renderedEl.contains(element)) {
      this.stateService.hoveredBoxModel.set(null);
      return;
    }

    this.stateService.hoveredBoxModel.set(getBoxModel(element));
  }
}
```

**Commit:**
```bash
git add packages/plugin-box-model/src/box-model-overlay.component.ts
git commit -m "feat(plugin-box-model): implement BoxModelOverlayComponent"
```

---

### Task 10: `BoxModelPanelComponent`

**File:** `packages/plugin-box-model/src/box-model-panel.component.ts`

```typescript
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { BoxModelStateService } from './box-model-state.service.js';

@Component({
  selector: 'prism-box-model-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="prism-bmp">
      @if (stateService.hoveredBoxModel(); as bm) {
        <div class="prism-bmp__diagram">
          <div class="prism-bmp__region prism-bmp__region--margin">
            <span class="prism-bmp__region-label">margin</span>
            <div class="prism-bmp__sides">
              <span class="prism-bmp__side">{{ fmt(bm.margin.top) }}</span>
              <div class="prism-bmp__inner-row">
                <span class="prism-bmp__side">{{ fmt(bm.margin.left) }}</span>
                <div class="prism-bmp__region prism-bmp__region--border">
                  <span class="prism-bmp__region-label">border</span>
                  <div class="prism-bmp__inner-row">
                    <span class="prism-bmp__side prism-bmp__side--dim">{{ fmt(bm.border.left) }}</span>
                    <div class="prism-bmp__region prism-bmp__region--padding">
                      <span class="prism-bmp__region-label">padding</span>
                      <div class="prism-bmp__sides">
                        <span class="prism-bmp__side">{{ fmt(bm.padding.top) }}</span>
                        <div class="prism-bmp__inner-row">
                          <span class="prism-bmp__side">{{ fmt(bm.padding.left) }}</span>
                          <div class="prism-bmp__content-box">
                            {{ contentW(bm) }} × {{ contentH(bm) }}
                          </div>
                          <span class="prism-bmp__side">{{ fmt(bm.padding.right) }}</span>
                        </div>
                        <span class="prism-bmp__side">{{ fmt(bm.padding.bottom) }}</span>
                      </div>
                    </div>
                    <span class="prism-bmp__side prism-bmp__side--dim">{{ fmt(bm.border.right) }}</span>
                  </div>
                </div>
                <span class="prism-bmp__side">{{ fmt(bm.margin.right) }}</span>
              </div>
              <span class="prism-bmp__side">{{ fmt(bm.margin.bottom) }}</span>
            </div>
          </div>
        </div>
      } @else {
        <div class="prism-bmp__empty">
          Hover over an element to inspect its box model.
        </div>
      }
    </div>
  `,
  styles: `
    :host { display: block; height: 100%; overflow: auto; }
    .prism-bmp {
      padding: 16px;
      font-family: var(--prism-font-sans, system-ui);
      font-size: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100%;
    }
    .prism-bmp__diagram { width: 100%; max-width: 340px; }
    .prism-bmp__region {
      padding: 6px;
      border-radius: 4px;
      position: relative;
    }
    .prism-bmp__region--margin  { background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.4); }
    .prism-bmp__region--border  { background: rgba(234, 179, 8, 0.2);   border: 1px solid rgba(234, 179, 8, 0.5); }
    .prism-bmp__region--padding { background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.4); }
    .prism-bmp__region-label {
      position: absolute;
      top: 3px;
      left: 6px;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--prism-text-muted, #6b7280);
      opacity: 0.8;
    }
    .prism-bmp__sides {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      padding-top: 14px;
    }
    .prism-bmp__inner-row {
      display: flex;
      align-items: center;
      gap: 2px;
      width: 100%;
    }
    .prism-bmp__inner-row > .prism-bmp__region { flex: 1; }
    .prism-bmp__side {
      font-family: monospace;
      font-size: 11px;
      color: var(--prism-text, #1f2937);
      min-width: 28px;
      text-align: center;
      padding: 1px 4px;
    }
    .prism-bmp__side--dim { color: var(--prism-text-muted, #6b7280); }
    .prism-bmp__content-box {
      flex: 1;
      text-align: center;
      font-family: monospace;
      font-size: 11px;
      color: var(--prism-text, #1f2937);
      background: rgba(59, 130, 246, 0.2);
      border: 1px solid rgba(59, 130, 246, 0.4);
      border-radius: 3px;
      padding: 6px 4px;
    }
    .prism-bmp__empty {
      color: var(--prism-text-muted, #6b7280);
      font-size: 13px;
    }
  `,
})
export class BoxModelPanelComponent {
  protected readonly stateService = inject(BoxModelStateService);

  fmt(value: number): string {
    return value === 0 ? '-' : `${value}`;
  }

  contentW(bm: ReturnType<BoxModelStateService['hoveredBoxModel']>): string {
    if (!bm) return '';
    return String(Math.round(bm.content.width - bm.border.left - bm.border.right - bm.padding.left - bm.padding.right));
  }

  contentH(bm: ReturnType<BoxModelStateService['hoveredBoxModel']>): string {
    if (!bm) return '';
    return String(Math.round(bm.content.height - bm.border.top - bm.border.bottom - bm.padding.top - bm.padding.bottom));
  }
}
```

**Commit:**
```bash
git add packages/plugin-box-model/src/box-model-panel.component.ts
git commit -m "feat(plugin-box-model): implement BoxModelPanelComponent"
```

---

### Task 11: Plugin factory (TDD)

**Files:**
- Create: `packages/plugin-box-model/src/box-model-plugin.ts`
- Create: `packages/plugin-box-model/src/box-model-plugin.spec.ts`

**Step 1: Write the failing tests**

```typescript
// packages/plugin-box-model/src/box-model-plugin.spec.ts
import { boxModelPlugin } from './box-model-plugin.js';

describe('boxModelPlugin', () => {
  it('returns a plugin with name "box-model"', () => {
    expect(boxModelPlugin().name).toBe('box-model');
  });

  it('registers exactly one panel', () => {
    expect(boxModelPlugin().panels).toHaveLength(1);
  });

  it('panel has id "box-model" and label "Box Model"', () => {
    const [panel] = boxModelPlugin().panels!;
    expect(panel.id).toBe('box-model');
    expect(panel.label).toBe('Box Model');
  });

  it('panel has loadComponent for lazy loading', () => {
    const [panel] = boxModelPlugin().panels!;
    expect(typeof panel.loadComponent).toBe('function');
  });

  it('panel has loadOverlayComponent for lazy overlay', () => {
    const [panel] = boxModelPlugin().panels!;
    expect(typeof panel.loadOverlayComponent).toBe('function');
  });

  it('has no build-time hooks', () => {
    const plugin = boxModelPlugin();
    expect(plugin.onComponentScanned).toBeUndefined();
    expect(plugin.onPageScanned).toBeUndefined();
    expect(plugin.onManifestReady).toBeUndefined();
  });
});
```

**Step 2: Run to verify they fail**

```bash
npx nx test plugin-box-model -- --testPathPatterns=box-model-plugin
```

Expected: FAIL — `Cannot find module './box-model-plugin.js'`

**Step 3: Implement**

```typescript
// packages/plugin-box-model/src/box-model-plugin.ts
import type { NgPrismPlugin } from 'ng-prism/plugin';

export function boxModelPlugin(): NgPrismPlugin {
  return {
    name: 'box-model',
    panels: [
      {
        id: 'box-model',
        label: 'Box Model',
        loadComponent: () =>
          import('./box-model-panel.component.js').then((m) => m.BoxModelPanelComponent),
        loadOverlayComponent: () =>
          import('./box-model-overlay.component.js').then((m) => m.BoxModelOverlayComponent),
        position: 'bottom',
      },
    ],
  };
}
```

**Step 4: Run to verify they pass**

```bash
npx nx test plugin-box-model -- --testPathPatterns=box-model-plugin
```

Expected: PASS (6 tests)

**Step 5: Commit**

```bash
git add packages/plugin-box-model/src/box-model-plugin.ts \
        packages/plugin-box-model/src/box-model-plugin.spec.ts
git commit -m "feat(plugin-box-model): implement boxModelPlugin factory (TDD)"
```

---

### Task 12: Public API `index.ts`

**File:** `packages/plugin-box-model/src/index.ts`

```typescript
export { boxModelPlugin } from './box-model-plugin.js';
export type { BoxModelData, BoxSides } from './box-model.types.js';
```

**Commit:**
```bash
git add packages/plugin-box-model/src/index.ts
git commit -m "feat(plugin-box-model): add public API index"
```

---

## Phase 4: Build & Test

### Task 13: Build core first, then plugin

**Step 1: Build core**

```bash
npx nx build ng-prism
```

Expected: Succeeds.

**Step 2: Build plugin**

```bash
npx nx build plugin-box-model
```

Expected: Succeeds with no `ngc` errors.

**Step 3: Run all plugin tests**

```bash
npx nx test plugin-box-model
```

Expected: PASS (11+ tests: 5 utils + 6 plugin factory)

**Step 4: Run all core tests**

```bash
npx nx test ng-prism
```

Expected: All tests pass (including new `prism-panel.service.spec.ts`).

**Step 5: Final commit if anything was adjusted**

```bash
git add -p   # stage only relevant adjustments
git commit -m "fix(plugin-box-model): post-build corrections"
```

---

## Usage Example

In a consumer's `prism.config.ts`:

```typescript
import { defineConfig } from 'ng-prism/config';
import { boxModelPlugin } from '@ng-prism/plugin-box-model';

export default defineConfig({
  plugins: [boxModelPlugin()],
});
```

Clicking the **Box Model** tab activates the overlay in the canvas. Hovering over any element shows colored boxes (amber margin → yellow border → green padding → blue content) plus the DevTools-style diagram in the panel below.
