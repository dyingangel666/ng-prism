# Directive Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable ng-prism to showcase Angular directives by adding a `host` property to `@Showcase` and generating wrapper components at build time.

**Architecture:** The scanner learns to detect `@Directive` alongside `@Component`. A `host` config on `ShowcaseConfig` defines the host element. The manifest generator produces wrapper components for directives, so the renderer and controls panels work unchanged.

**Tech Stack:** TypeScript Compiler API, Angular 21, Jest 30 + SWC

---

### Task 1: Extend ShowcaseConfig types with `host` and `DirectiveHost`

**Files:**
- Modify: `packages/ng-prism/src/decorator/showcase.types.ts`

- [ ] **Step 1: Add `DirectiveHost` interface and `host` property**

```typescript
// Add after the ShowcaseConfig interface, before the Variant interface:

export interface DirectiveHost {
  selector: string;
  import: { name: string; from: string };
  inputs?: Record<string, unknown>;
}
```

Add to `ShowcaseConfig`:

```typescript
export interface ShowcaseConfig {
  // ... existing properties ...

  /** Host element for directive showcases. String = HTML element (e.g. '<button class="btn">'), object = Angular component. */
  host?: string | DirectiveHost;
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/ng-prism/src/decorator/showcase.types.ts
git commit -m "feat: add host and DirectiveHost types to ShowcaseConfig"
```

---

### Task 2: Add `isDirective` to `ScannedComponent.componentMeta`

**Files:**
- Modify: `packages/ng-prism/src/plugin/plugin.types.ts`

- [ ] **Step 1: Add `isDirective` to `componentMeta`**

In `plugin.types.ts`, update the `componentMeta` type inside `ScannedComponent`:

```typescript
componentMeta: {
  selector: string;
  standalone: boolean;
  isDirective: boolean;
};
```

- [ ] **Step 2: Fix existing test fixtures — add `isDirective: false`**

In `packages/ng-prism/src/builder/manifest/runtime-manifest.generator.spec.ts`, update the BUTTON and CARD fixtures:

```typescript
const BUTTON: ScannedComponent = {
  // ... existing fields ...
  componentMeta: { selector: 'my-button', standalone: true, isDirective: false },
};

const CARD: ScannedComponent = {
  // ... existing fields ...
  componentMeta: { selector: 'my-card', standalone: true, isDirective: false },
};
```

- [ ] **Step 3: Fix scanner — set `isDirective: false` for components**

In `packages/ng-prism/src/builder/scanner/component.scanner.ts`, update `extractComponentMeta`:

```typescript
function extractComponentMeta(classDecl: ts.ClassDeclaration): ScannedComponent['componentMeta'] {
  const componentDecorator = findDecorator(classDecl, 'Component');
  if (!componentDecorator) {
    return { selector: '', standalone: true, isDirective: false };
  }

  const arg = getDecoratorArgument(componentDecorator);
  if (!arg) return { selector: '', standalone: true, isDirective: false };

  const raw = evaluateExpression(arg);
  if (!raw || typeof raw !== 'object') {
    return { selector: '', standalone: true, isDirective: false };
  }

  const obj = raw as Record<string, unknown>;
  return {
    selector: (obj['selector'] as string) ?? '',
    standalone: obj['standalone'] !== false,
    isDirective: false,
  };
}
```

- [ ] **Step 4: Run tests to verify nothing breaks**

Run: `npx nx test ng-prism`
Expected: All existing tests pass (the new `isDirective: false` is backward compatible).

- [ ] **Step 5: Commit**

```bash
git add packages/ng-prism/src/plugin/plugin.types.ts packages/ng-prism/src/builder/scanner/component.scanner.ts packages/ng-prism/src/builder/manifest/runtime-manifest.generator.spec.ts
git commit -m "feat: add isDirective to componentMeta type"
```

---

### Task 3: Create directive test fixture

**Files:**
- Create: `packages/ng-prism/src/builder/scanner/__fixtures__/highlight.directive.ts`
- Modify: `packages/ng-prism/src/builder/scanner/__fixtures__/public-api.ts`

- [ ] **Step 1: Create directive fixture file**

Create `packages/ng-prism/src/builder/scanner/__fixtures__/highlight.directive.ts`:

```typescript
import { Directive, Input, input, output } from '@angular/core';

interface ShowcaseConfig {
  title: string;
  description?: string;
  category?: string;
  variants?: { name: string; inputs?: Record<string, unknown>; content?: string }[];
  tags?: string[];
  host?: string | { selector: string; import: { name: string; from: string }; inputs?: Record<string, unknown> };
}

function Showcase(config: ShowcaseConfig): ClassDecorator {
  return () => {};
}

@Showcase({
  title: 'Highlight',
  category: 'Utility',
  description: 'Highlights the host element on hover',
  host: '<span class="demo-text">',
  variants: [
    { name: 'Yellow', inputs: { highlightColor: 'yellow' }, content: 'Hover me' },
    { name: 'Cyan', inputs: { highlightColor: 'cyan' }, content: 'Hover me' },
  ],
  tags: ['visual', 'hover'],
})
@Directive({
  selector: '[appHighlight]',
  standalone: true,
})
export class HighlightDirective {
  /** The background color to apply on hover */
  highlightColor = input('yellow');

  /** Emits when the highlight activates */
  highlighted = output<boolean>();
}
```

- [ ] **Step 2: Export from public-api**

In `packages/ng-prism/src/builder/scanner/__fixtures__/public-api.ts`, add:

```typescript
export { HighlightDirective } from './highlight.directive.js';
```

- [ ] **Step 3: Commit**

```bash
git add packages/ng-prism/src/builder/scanner/__fixtures__/highlight.directive.ts packages/ng-prism/src/builder/scanner/__fixtures__/public-api.ts
git commit -m "test: add HighlightDirective fixture for scanner tests"
```

---

### Task 4: Teach the scanner to detect `@Directive`

**Files:**
- Modify: `packages/ng-prism/src/builder/scanner/component.scanner.ts`
- Test: `packages/ng-prism/src/builder/scanner/component.scanner.spec.ts`

- [ ] **Step 1: Write failing tests for directive scanning**

Add to `packages/ng-prism/src/builder/scanner/component.scanner.spec.ts`:

```typescript
it('should find @Showcase-annotated directives', () => {
  const components = scanComponents(exports, checker);
  const names = components.map((c) => c.className);

  expect(names).toContain('HighlightDirective');
});

it('should set isDirective true for directives', () => {
  const components = scanComponents(exports, checker);
  const highlight = components.find((c) => c.className === 'HighlightDirective')!;

  expect(highlight.componentMeta.isDirective).toBe(true);
  expect(highlight.componentMeta.selector).toBe('[appHighlight]');
  expect(highlight.componentMeta.standalone).toBe(true);
});

it('should set isDirective false for components', () => {
  const components = scanComponents(exports, checker);
  const button = components.find((c) => c.className === 'ButtonComponent')!;

  expect(button.componentMeta.isDirective).toBe(false);
});

it('should extract inputs and outputs from directives', () => {
  const components = scanComponents(exports, checker);
  const highlight = components.find((c) => c.className === 'HighlightDirective')!;

  expect(highlight.inputs).toHaveLength(1);
  expect(highlight.inputs[0].name).toBe('highlightColor');
  expect(highlight.inputs[0].type).toBe('string');
  expect(highlight.inputs[0].defaultValue).toBe('yellow');

  expect(highlight.outputs).toHaveLength(1);
  expect(highlight.outputs[0].name).toBe('highlighted');
});

it('should extract host config from directive showcase', () => {
  const components = scanComponents(exports, checker);
  const highlight = components.find((c) => c.className === 'HighlightDirective')!;

  expect(highlight.showcaseConfig.host).toBe('<span class="demo-text">');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx nx test ng-prism -- --testPathPatterns=component.scanner.spec`
Expected: FAIL — `HighlightDirective` is not found (scanner skips directives).

- [ ] **Step 3: Update `extractComponentMeta` to handle `@Directive`**

In `packages/ng-prism/src/builder/scanner/component.scanner.ts`, replace `extractComponentMeta`:

```typescript
function extractComponentMeta(classDecl: ts.ClassDeclaration): ScannedComponent['componentMeta'] {
  const componentDecorator = findDecorator(classDecl, 'Component');
  if (componentDecorator) {
    const arg = getDecoratorArgument(componentDecorator);
    if (!arg) return { selector: '', standalone: true, isDirective: false };

    const raw = evaluateExpression(arg);
    if (!raw || typeof raw !== 'object') {
      return { selector: '', standalone: true, isDirective: false };
    }

    const obj = raw as Record<string, unknown>;
    return {
      selector: (obj['selector'] as string) ?? '',
      standalone: obj['standalone'] !== false,
      isDirective: false,
    };
  }

  const directiveDecorator = findDecorator(classDecl, 'Directive');
  if (directiveDecorator) {
    const arg = getDecoratorArgument(directiveDecorator);
    if (!arg) return { selector: '', standalone: true, isDirective: true };

    const raw = evaluateExpression(arg);
    if (!raw || typeof raw !== 'object') {
      return { selector: '', standalone: true, isDirective: true };
    }

    const obj = raw as Record<string, unknown>;
    return {
      selector: (obj['selector'] as string) ?? '',
      standalone: obj['standalone'] !== false,
      isDirective: true,
    };
  }

  return { selector: '', standalone: true, isDirective: false };
}
```

- [ ] **Step 4: Update `extractShowcaseConfig` to parse `host`**

In the same file, update `extractShowcaseConfig` to extract the `host` property:

```typescript
function extractShowcaseConfig(decorator: ts.Decorator): ShowcaseConfig | undefined {
  const arg = getDecoratorArgument(decorator);
  if (!arg) return undefined;

  const raw = evaluateExpression(arg);
  if (!raw || typeof raw !== 'object' || !('title' in raw)) return undefined;

  const obj = raw as Record<string, unknown>;
  const config: ShowcaseConfig = {
    title: obj['title'] as string,
  };

  if (obj['description']) config.description = obj['description'] as string;
  if (obj['category']) config.category = obj['category'] as string;
  if (obj['tags']) config.tags = obj['tags'] as string[];
  if (obj['meta']) config.meta = obj['meta'] as Record<string, unknown>;
  if (obj['host'] !== undefined) config.host = obj['host'] as ShowcaseConfig['host'];

  if (Array.isArray(obj['variants'])) {
    config.variants = obj['variants'] as ShowcaseConfig['variants'];
  }

  // providers are skipped — not statically serializable
  return config;
}
```

- [ ] **Step 5: Update the count assertion in existing test**

The existing test `'should find only @Showcase-annotated components'` expects `toHaveLength(4)`. Now there are 5 (4 components + 1 directive). Update in `component.scanner.spec.ts`:

```typescript
it('should find only @Showcase-annotated components', () => {
  const components = scanComponents(exports, checker);
  const names = components.map((c) => c.className);

  expect(names).toContain('ButtonComponent');
  expect(names).toContain('CardComponent');
  expect(names).toContain('SignalButtonComponent');
  expect(names).toContain('ModelInputComponent');
  expect(names).toContain('HighlightDirective');
  expect(names).not.toContain('NoShowcaseComponent');
  expect(components).toHaveLength(5);
});
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx nx test ng-prism -- --testPathPatterns=component.scanner.spec`
Expected: PASS — all tests green.

- [ ] **Step 7: Commit**

```bash
git add packages/ng-prism/src/builder/scanner/component.scanner.ts packages/ng-prism/src/builder/scanner/component.scanner.spec.ts
git commit -m "feat: teach scanner to detect @Directive with @Showcase"
```

---

### Task 5: Update integration scanner test

**Files:**
- Modify: `packages/ng-prism/src/builder/scanner/scanner.spec.ts`

- [ ] **Step 1: Update count and add directive assertion**

In `scanner.spec.ts`, update the first test and add a directive-specific test:

```typescript
it('should scan the full pipeline from entry point to manifest', () => {
  const entryPoint = path.join(FIXTURES_DIR, 'public-api.ts');
  const manifest = scan({ entryPoint });

  expect(manifest.components).toHaveLength(5);
});
```

Add a new test:

```typescript
it('should produce correct HighlightDirective data', () => {
  const entryPoint = path.join(FIXTURES_DIR, 'public-api.ts');
  const manifest = scan({ entryPoint });
  const highlight = manifest.components.find((c) => c.className === 'HighlightDirective')!;

  expect(highlight).toBeDefined();
  expect(highlight.showcaseConfig.title).toBe('Highlight');
  expect(highlight.showcaseConfig.host).toBe('<span class="demo-text">');
  expect(highlight.componentMeta.isDirective).toBe(true);
  expect(highlight.componentMeta.selector).toBe('[appHighlight]');
  expect(highlight.inputs).toHaveLength(1);
  expect(highlight.outputs).toHaveLength(1);
});
```

Also update the `'should accept custom compiler options'` test:

```typescript
it('should accept custom compiler options', () => {
  const entryPoint = path.join(FIXTURES_DIR, 'public-api.ts');
  const manifest = scan({
    entryPoint,
    compilerOptions: { strict: false },
  });

  expect(manifest.components).toHaveLength(5);
});
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `npx nx test ng-prism -- --testPathPatterns=scanner.spec`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add packages/ng-prism/src/builder/scanner/scanner.spec.ts
git commit -m "test: add directive assertions to integration scanner test"
```

---

### Task 6: Host string parser utility

**Files:**
- Create: `packages/ng-prism/src/builder/manifest/host-parser.ts`
- Create: `packages/ng-prism/src/builder/manifest/host-parser.spec.ts`

- [ ] **Step 1: Write failing tests for host string parsing**

Create `packages/ng-prism/src/builder/manifest/host-parser.spec.ts`:

```typescript
import { parseHostString } from './host-parser.js';

describe('parseHostString', () => {
  it('should parse a simple element tag', () => {
    const result = parseHostString('<button>');
    expect(result).toEqual({ tag: 'button', attrs: '' });
  });

  it('should parse an element with a class attribute', () => {
    const result = parseHostString('<span class="demo-text">');
    expect(result).toEqual({ tag: 'span', attrs: 'class="demo-text"' });
  });

  it('should parse an element with multiple attributes', () => {
    const result = parseHostString('<div class="wrapper" data-testid="host">');
    expect(result).toEqual({ tag: 'div', attrs: 'class="wrapper" data-testid="host"' });
  });

  it('should handle self-closing tags', () => {
    const result = parseHostString('<input />');
    expect(result).toEqual({ tag: 'input', attrs: '' });
  });

  it('should handle self-closing tags with attributes', () => {
    const result = parseHostString('<input type="text" />');
    expect(result).toEqual({ tag: 'input', attrs: 'type="text"' });
  });

  it('should trim whitespace', () => {
    const result = parseHostString('  <button>  ');
    expect(result).toEqual({ tag: 'button', attrs: '' });
  });

  it('should return null for invalid input', () => {
    expect(parseHostString('')).toBeNull();
    expect(parseHostString('button')).toBeNull();
    expect(parseHostString('not html')).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx nx test ng-prism -- --testPathPatterns=host-parser.spec`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the parser**

Create `packages/ng-prism/src/builder/manifest/host-parser.ts`:

```typescript
export interface ParsedHost {
  tag: string;
  attrs: string;
}

export function parseHostString(host: string): ParsedHost | null {
  const trimmed = host.trim();
  const match = trimmed.match(/^<\s*([a-zA-Z][a-zA-Z0-9-]*)((?:\s+[^>]*?)?)\s*\/?\s*>$/);
  if (!match) return null;

  const tag = match[1];
  const attrs = match[2].trim();

  return { tag, attrs };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx nx test ng-prism -- --testPathPatterns=host-parser.spec`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/ng-prism/src/builder/manifest/host-parser.ts packages/ng-prism/src/builder/manifest/host-parser.spec.ts
git commit -m "feat: add host string parser for directive showcase"
```

---

### Task 7: Generate wrapper components in the manifest generator

**Files:**
- Modify: `packages/ng-prism/src/builder/manifest/runtime-manifest.generator.ts`
- Modify: `packages/ng-prism/src/builder/manifest/runtime-manifest.generator.spec.ts`

- [ ] **Step 1: Write failing tests for directive wrapper generation**

Add to `runtime-manifest.generator.spec.ts`:

```typescript
const HIGHLIGHT: ScannedComponent = {
  className: 'HighlightDirective',
  filePath: 'src/lib/highlight/highlight.directive.ts',
  showcaseConfig: {
    title: 'Highlight',
    category: 'Utility',
    host: '<span class="demo-text">',
    variants: [
      { name: 'Yellow', inputs: { highlightColor: 'yellow' }, content: 'Hover me' },
    ],
  },
  inputs: [
    { name: 'highlightColor', type: 'string', defaultValue: 'yellow', required: false },
  ],
  outputs: [{ name: 'highlighted' }],
  componentMeta: { selector: '[appHighlight]', standalone: true, isDirective: true },
};

const TOOLTIP_WITH_HOST_COMPONENT: ScannedComponent = {
  className: 'TooltipDirective',
  filePath: 'src/lib/tooltip/tooltip.directive.ts',
  showcaseConfig: {
    title: 'Tooltip',
    host: {
      selector: 'my-button',
      import: { name: 'ButtonComponent', from: 'my-lib' },
      inputs: { label: 'Click me' },
    },
  },
  inputs: [
    { name: 'tooltipText', type: 'string', required: false },
  ],
  outputs: [],
  componentMeta: { selector: '[appTooltip]', standalone: true, isDirective: true },
};
```

Then add the tests:

```typescript
describe('directive wrapper generation', () => {
  it('should generate a wrapper component class for directives with string host', () => {
    const source = generateRuntimeManifest({ components: [HIGHLIGHT], libraryImportPath: 'my-lib' });

    expect(source).toContain('class HighlightDirective__PrismHost');
    expect(source).toContain('@Component');
    expect(source).toContain('imports: [HighlightDirective]');
  });

  it('should generate template with host element and directive selector', () => {
    const source = generateRuntimeManifest({ components: [HIGHLIGHT], libraryImportPath: 'my-lib' });

    expect(source).toContain('appHighlight');
    expect(source).toContain('<span');
    expect(source).toContain('class="demo-text"');
  });

  it('should generate input bindings in the template for each directive input', () => {
    const source = generateRuntimeManifest({ components: [HIGHLIGHT], libraryImportPath: 'my-lib' });

    expect(source).toContain('[highlightColor]="highlightColor()"');
  });

  it('should generate output bindings in the template for each directive output', () => {
    const source = generateRuntimeManifest({ components: [HIGHLIGHT], libraryImportPath: 'my-lib' });

    expect(source).toContain('(highlighted)="highlighted.emit($event)"');
  });

  it('should generate signal input declarations on the wrapper class', () => {
    const source = generateRuntimeManifest({ components: [HIGHLIGHT], libraryImportPath: 'my-lib' });

    expect(source).toContain('highlightColor = input');
  });

  it('should generate __prismContent__ input on the wrapper class', () => {
    const source = generateRuntimeManifest({ components: [HIGHLIGHT], libraryImportPath: 'my-lib' });

    expect(source).toContain("__prismContent__ = input('')");
  });

  it('should reference the wrapper class as type in the manifest entry', () => {
    const source = generateRuntimeManifest({ components: [HIGHLIGHT], libraryImportPath: 'my-lib' });

    expect(source).toContain('type: HighlightDirective__PrismHost,');
    expect(source).not.toContain('type: HighlightDirective,');
  });

  it('should generate wrapper with Angular component import for object host', () => {
    const source = generateRuntimeManifest({ components: [TOOLTIP_WITH_HOST_COMPONENT], libraryImportPath: 'my-lib' });

    expect(source).toContain('imports: [TooltipDirective, ButtonComponent]');
    expect(source).toContain("import { ButtonComponent } from 'my-lib';");
    expect(source).toContain('<my-button');
    expect(source).toContain('appTooltip');
    expect(source).toContain('label="Click me"');
  });

  it('should generate both components and directive wrappers in the same manifest', () => {
    const source = generateRuntimeManifest({ components: [BUTTON, HIGHLIGHT], libraryImportPath: 'my-lib' });

    expect(source).toContain('type: ButtonComponent,');
    expect(source).toContain('type: HighlightDirective__PrismHost,');
    expect(source).toContain('class HighlightDirective__PrismHost');
  });

  it('should import input and output from @angular/core for wrapper classes', () => {
    const source = generateRuntimeManifest({ components: [HIGHLIGHT], libraryImportPath: 'my-lib' });

    expect(source).toContain("import { Component, input, output } from '@angular/core';");
  });

  it('should not generate Angular imports when there are no directives', () => {
    const source = generateRuntimeManifest({ components: [BUTTON], libraryImportPath: 'my-lib' });

    expect(source).not.toContain("from '@angular/core'");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx nx test ng-prism -- --testPathPatterns=runtime-manifest.generator.spec`
Expected: FAIL — no wrapper generation logic exists yet.

- [ ] **Step 3: Implement wrapper generation**

Update `packages/ng-prism/src/builder/manifest/runtime-manifest.generator.ts`. Add import for the host parser and the `DirectiveHost` type, then add wrapper generation logic:

```typescript
import type { ScannedComponent } from '../../plugin/plugin.types.js';
import type { DirectiveHost } from '../../decorator/showcase.types.js';
import type { StyleguidePage } from '../../plugin/page.types.js';
import { parseHostString } from './host-parser.js';

export interface RuntimeManifestOptions {
  components: ScannedComponent[];
  libraryImportPath: string;
  pages?: StyleguidePage[];
}

function groupComponentsByImportPath(
  components: ScannedComponent[],
  fallbackImportPath: string,
): Map<string, string[]> {
  const groups = new Map<string, string[]>();
  for (const comp of components) {
    const path = comp.importPath ?? fallbackImportPath;
    const list = groups.get(path);
    if (list) {
      list.push(comp.className);
    } else {
      groups.set(path, [comp.className]);
    }
  }
  return groups;
}

function directiveSelector(selector: string): string {
  const match = selector.match(/^\[([^\]]+)]$/);
  return match ? match[1] : selector;
}

function generateWrapperClass(comp: ScannedComponent): string {
  const wrapperName = `${comp.className}__PrismHost`;
  const host = comp.showcaseConfig.host;
  const directiveAttr = directiveSelector(comp.componentMeta.selector);

  let tag: string;
  let attrs: string;
  let hostImports = `[${comp.className}]`;
  let hostInputAttrs = '';

  if (typeof host === 'string') {
    const parsed = parseHostString(host);
    tag = parsed?.tag ?? 'div';
    attrs = parsed?.attrs ?? '';
  } else if (host && typeof host === 'object') {
    const hostObj = host as DirectiveHost;
    tag = hostObj.selector;
    hostImports = `[${comp.className}, ${hostObj.import.name}]`;
    const staticInputs = Object.entries(hostObj.inputs ?? {})
      .map(([k, v]) => `${k}="${String(v)}"`)
      .join(' ');
    attrs = staticInputs;
  } else {
    tag = 'div';
    attrs = '';
  }

  const inputBindings = comp.inputs
    .map((i) => `[${i.name}]="${i.name}()"`)
    .join(' ');

  const outputBindings = comp.outputs
    .map((o) => `(${o.name})="${o.name}.emit($event)"`)
    .join(' ');

  const allBindings = [
    directiveAttr,
    inputBindings,
    outputBindings,
  ].filter(Boolean).join(' ');

  const attrsStr = attrs ? ` ${attrs}` : '';
  const template = `<${tag}${attrsStr} ${allBindings}>{{ __prismContent__() }}</${tag}>`;

  const inputDecls = comp.inputs
    .map((i) => `  ${i.name} = input(${i.defaultValue !== undefined ? JSON.stringify(i.defaultValue) : "''"});`)
    .join('\n');

  const outputDecls = comp.outputs
    .map((o) => `  ${o.name} = output();`)
    .join('\n');

  const lines = [
    `@Component({`,
    `  standalone: true,`,
    `  imports: ${hostImports},`,
    `  template: \`${template}\`,`,
    `})`,
    `class ${wrapperName} {`,
    inputDecls,
    outputDecls,
    `  __prismContent__ = input('');`,
    `}`,
  ];

  return lines.join('\n');
}

export function generateRuntimeManifest(options: RuntimeManifestOptions): string {
  const { components, libraryImportPath, pages } = options;

  const directives = components.filter((c) => c.componentMeta.isDirective);
  const hasDirectives = directives.length > 0;

  const lines: string[] = [
    '// AUTO-GENERATED by ng-prism — do not edit!',
    "import type { RuntimeManifest } from 'ng-prism/plugin';",
  ];

  if (hasDirectives) {
    lines.push("import { Component, input, output } from '@angular/core';");
  }

  if (components.length > 0) {
    const groups = groupComponentsByImportPath(components, libraryImportPath);

    const hostImportPaths = new Set<string>();
    for (const comp of directives) {
      const host = comp.showcaseConfig.host;
      if (host && typeof host === 'object' && 'import' in host) {
        const hostObj = host as DirectiveHost;
        const existing = groups.get(hostObj.import.from);
        if (existing) {
          if (!existing.includes(hostObj.import.name)) {
            existing.push(hostObj.import.name);
          }
        } else {
          groups.set(hostObj.import.from, [hostObj.import.name]);
        }
        hostImportPaths.add(hostObj.import.from);
      }
    }

    for (const [path, classNames] of groups) {
      lines.push(`import { ${classNames.join(', ')} } from '${path}';`);
    }
  }

  if (hasDirectives) {
    lines.push('');
    for (const comp of directives) {
      lines.push(generateWrapperClass(comp));
      lines.push('');
    }
  }

  lines.push('');
  lines.push('export const PRISM_RUNTIME_MANIFEST: RuntimeManifest = {');
  lines.push('  components: [');

  for (const comp of components) {
    const typeName = comp.componentMeta.isDirective
      ? `${comp.className}__PrismHost`
      : comp.className;
    lines.push('    {');
    lines.push(`      type: ${typeName},`);
    lines.push(`      meta: ${formatMeta(comp, 6)},`);
    lines.push('    },');
  }

  lines.push('  ],');

  if (pages && pages.length > 0) {
    lines.push(`  pages: ${JSON.stringify(pages, null, 2).split('\n').map((l, i) => i === 0 ? l : '  ' + l).join('\n')},`);
  }

  lines.push('};');
  lines.push('');

  return lines.join('\n');
}
```

Keep the existing `json`, `indent`, `formatMeta`, `formatObject`, `formatArray` helper functions unchanged.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx nx test ng-prism -- --testPathPatterns=runtime-manifest.generator.spec`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/ng-prism/src/builder/manifest/runtime-manifest.generator.ts packages/ng-prism/src/builder/manifest/runtime-manifest.generator.spec.ts
git commit -m "feat: generate wrapper components for directives in manifest"
```

---

### Task 8: Directive-style snippets in the snippet generator

**Files:**
- Modify: `packages/ng-prism/src/app/renderer/snippet-generator.ts`
- Modify: `packages/ng-prism/src/app/renderer/snippet-generator.spec.ts`

- [ ] **Step 1: Write failing tests for directive snippets**

Add to `snippet-generator.spec.ts`:

```typescript
describe('directive snippets', () => {
  it('should render directive on host element', () => {
    const inputs = [meta({ name: 'highlightColor' })];
    const result = generateSnippet(
      '[appHighlight]', inputs, { highlightColor: 'yellow' },
      undefined, 'Hover me',
      { host: '<span class="demo-text">' },
    );
    expect(result).toBe('<span class="demo-text" appHighlight highlightColor="yellow">Hover me</span>');
  });

  it('should render directive on plain host element without attributes', () => {
    const inputs = [meta({ name: 'color' })];
    const result = generateSnippet(
      '[appHighlight]', inputs, { color: 'red' },
      undefined, undefined,
      { host: '<div>' },
    );
    expect(result).toBe('<div appHighlight color="red" />');
  });

  it('should render directive with object host', () => {
    const inputs = [meta({ name: 'tooltipText' })];
    const result = generateSnippet(
      '[appTooltip]', inputs, { tooltipText: 'Hello' },
      undefined, 'Click me',
      { host: { selector: 'my-button', import: { name: 'ButtonComponent', from: 'my-lib' }, inputs: { variant: 'primary' } } },
    );
    expect(result).toContain('<my-button');
    expect(result).toContain('appTooltip');
    expect(result).toContain('variant="primary"');
    expect(result).toContain('tooltipText="Hello"');
    expect(result).toContain('Click me');
    expect(result).toContain('</my-button>');
  });

  it('should fall back to normal snippet when no host is provided', () => {
    const result = generateSnippet('lib-button', [], {}, undefined, 'Click');
    expect(result).toBe('<lib-button>Click</lib-button>');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx nx test ng-prism -- --testPathPatterns=snippet-generator.spec`
Expected: FAIL — `generateSnippet` does not accept the 6th argument yet.

- [ ] **Step 3: Update `generateSnippet` signature and implementation**

Update `packages/ng-prism/src/app/renderer/snippet-generator.ts`:

Add at the top, after the existing import:

```typescript
import type { DirectiveHost } from '../../decorator/showcase.types.js';

export interface SnippetDirectiveOptions {
  host?: string | DirectiveHost;
}
```

Update the `generateSnippet` function signature and add directive handling at the top:

```typescript
export function generateSnippet(
  selector: string,
  inputs: InputMeta[],
  values: Record<string, unknown>,
  explicitKeys?: ReadonlySet<string>,
  content?: string | Record<string, string>,
  directiveOptions?: SnippetDirectiveOptions,
): string {
  if (directiveOptions?.host) {
    return generateDirectiveSnippet(selector, inputs, values, explicitKeys, content, directiveOptions.host);
  }

  // ... existing component snippet logic unchanged ...
}
```

Add the `generateDirectiveSnippet` function:

```typescript
function directiveSelectorToAttr(selector: string): string {
  const match = selector.match(/^\[([^\]]+)]$/);
  return match ? match[1] : selector;
}

function parseHostStringSimple(host: string): { tag: string; attrs: string } {
  const match = host.trim().match(/^<\s*([a-zA-Z][a-zA-Z0-9-]*)((?:\s+[^>]*?)?)\s*\/?\s*>$/);
  if (!match) return { tag: 'div', attrs: '' };
  return { tag: match[1], attrs: match[2].trim() };
}

function generateDirectiveSnippet(
  selector: string,
  inputs: InputMeta[],
  values: Record<string, unknown>,
  explicitKeys: ReadonlySet<string> | undefined,
  content: string | Record<string, string> | undefined,
  host: string | DirectiveHost,
): string {
  const directiveAttr = directiveSelectorToAttr(selector);

  let tag: string;
  let hostAttrs: string[] = [];

  if (typeof host === 'string') {
    const parsed = parseHostStringSimple(host);
    tag = parsed.tag;
    if (parsed.attrs) hostAttrs.push(parsed.attrs);
  } else {
    tag = host.selector;
    if (host.inputs) {
      for (const [k, v] of Object.entries(host.inputs)) {
        hostAttrs.push(`${k}="${String(v)}"`);
      }
    }
  }

  const attributes: string[] = [];
  const processed = new Set<string>();

  for (const input of inputs) {
    processed.add(input.name);
    const value = values[input.name];

    if (value === undefined) continue;
    if (typeof value === 'boolean' && !value) continue;
    if (
      input.defaultValue !== undefined &&
      value === input.defaultValue &&
      !explicitKeys?.has(input.name)
    ) continue;

    pushAttribute(attributes, input.name, value);
  }

  for (const [name, value] of Object.entries(values)) {
    if (processed.has(name)) continue;
    if (value === undefined) continue;
    if (typeof value === 'boolean' && !value) continue;
    pushAttribute(attributes, name, value);
  }

  const allAttrs = [...hostAttrs, directiveAttr, ...attributes].join(' ');
  const contentHtml = resolveContentHtml(content);

  if (!contentHtml) {
    if (!allAttrs) return `<${tag} />`;
    const singleLine = `<${tag} ${allAttrs} />`;
    if (singleLine.length <= 80) return singleLine;
    const indented = [...hostAttrs, directiveAttr, ...attributes].map((a) => `  ${a}`).join('\n');
    return `<${tag}\n${indented} />`;
  }

  const openTag = `<${tag} ${allAttrs}>`;
  const closeTag = `</${tag}>`;
  const singleLine = `${openTag}${contentHtml}${closeTag}`;

  if (singleLine.length <= 80) return singleLine;

  const allAttrsList = [...hostAttrs, directiveAttr, ...attributes];
  if (allAttrsList.length <= 2) {
    return `${openTag}\n  ${contentHtml}\n${closeTag}`;
  }

  const indented = allAttrsList.map((a) => `  ${a}`).join('\n');
  return `<${tag}\n${indented}>\n  ${contentHtml}\n${closeTag}`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx nx test ng-prism -- --testPathPatterns=snippet-generator.spec`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/ng-prism/src/app/renderer/snippet-generator.ts packages/ng-prism/src/app/renderer/snippet-generator.spec.ts
git commit -m "feat: directive-style snippet generation"
```

---

### Task 9: Wire snippet generator in the renderer component

**Files:**
- Modify: `packages/ng-prism/src/app/renderer/prism-renderer.component.ts`

- [ ] **Step 1: Update the `snippet` computed to pass directive options**

In `prism-renderer.component.ts`, update the `snippet` computed signal (around line 217):

```typescript
readonly snippet = computed(() => {
  const comp = this.navigationService.activeComponent();
  if (!comp) return '';
  const variant = comp.meta.showcaseConfig.variants?.[this.rendererService.activeVariantIndex()];
  const explicitKeys = variant?.inputs ? new Set(Object.keys(variant.inputs)) : undefined;
  const directiveOptions = comp.meta.componentMeta.isDirective
    ? { host: comp.meta.showcaseConfig.host }
    : undefined;
  return generateSnippet(
    comp.meta.componentMeta.selector,
    comp.meta.inputs,
    this.rendererService.inputValues(),
    explicitKeys,
    this.rendererService.activeContent(),
    directiveOptions,
  );
});
```

- [ ] **Step 2: Commit**

```bash
git add packages/ng-prism/src/app/renderer/prism-renderer.component.ts
git commit -m "feat: pass directive options to snippet generator in renderer"
```

---

### Task 10: Handle `__prismContent__` in the renderer service

**Files:**
- Modify: `packages/ng-prism/src/app/services/prism-renderer.service.ts`

- [ ] **Step 1: Map `content` to `__prismContent__` for directive wrappers**

In `prism-renderer.service.ts`, update `applyVariant` to inject `__prismContent__` for directive wrappers:

```typescript
private applyVariant(index: number, comp: RuntimeComponent): void {
  const defaults: Record<string, unknown> = {};
  for (const input of comp.meta.inputs) {
    if (input.defaultValue !== undefined) {
      defaults[input.name] = input.defaultValue;
    }
  }

  const requiredInputNames = new Set(
    comp.meta.inputs.filter((i) => i.required).map((i) => i.name),
  );

  const reset: Record<string, unknown> = {};
  for (const v of comp.meta.showcaseConfig.variants ?? []) {
    for (const key of Object.keys(v.inputs ?? {})) {
      if (!requiredInputNames.has(key) && !(key in reset)) {
        reset[key] = undefined;
      }
    }
  }

  const variant = comp.meta.showcaseConfig.variants?.[index];
  const values = { ...reset, ...defaults, ...(variant?.inputs ?? {}) };

  if (comp.meta.componentMeta.isDirective && variant?.content) {
    values['__prismContent__'] = typeof variant.content === 'string' ? variant.content : '';
  }

  this.inputValues.set(values);
  this.activeContent.set(comp.meta.componentMeta.isDirective ? undefined : variant?.content);
}
```

For directives, `content` is routed to `__prismContent__` input instead of `activeContent` (which would trigger `projectableNodes` logic in the renderer).

- [ ] **Step 2: Commit**

```bash
git add packages/ng-prism/src/app/services/prism-renderer.service.ts
git commit -m "feat: route variant content to __prismContent__ for directives"
```

---

### Task 11: Serialize `host` in manifest metadata and `isDirective` in formatMeta

**Files:**
- Modify: `packages/ng-prism/src/builder/manifest/runtime-manifest.generator.ts`

- [ ] **Step 1: Verify `formatMeta` serializes `isDirective` and `host`**

The existing `formatMeta` function already serializes `componentMeta` via `formatObject`, which will include `isDirective`. Verify `showcaseConfig` serialization includes `host`.

Check: `showcaseConfig` is serialized with `formatObject(comp.showcaseConfig as ...)`. The `host` property is either a string or an object — both are handled by `formatObject`/`json`. No change needed if `formatObject` handles string values (it does via `json(value)`).

Write a test to confirm:

Add to `runtime-manifest.generator.spec.ts`:

```typescript
it('should serialize isDirective in componentMeta', () => {
  const source = generateRuntimeManifest({ components: [HIGHLIGHT], libraryImportPath: 'my-lib' });

  expect(source).toContain('isDirective: true');
});

it('should serialize host in showcaseConfig', () => {
  const source = generateRuntimeManifest({ components: [HIGHLIGHT], libraryImportPath: 'my-lib' });

  expect(source).toContain('host: "<span class=\\"demo-text\\">"');
});
```

- [ ] **Step 2: Run tests**

Run: `npx nx test ng-prism -- --testPathPatterns=runtime-manifest.generator.spec`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add packages/ng-prism/src/builder/manifest/runtime-manifest.generator.ts packages/ng-prism/src/builder/manifest/runtime-manifest.generator.spec.ts
git commit -m "test: verify isDirective and host serialization in manifest"
```

---

### Task 12: Run full test suite

**Files:** None (verification only)

- [ ] **Step 1: Run all ng-prism tests**

Run: `npx nx test ng-prism`
Expected: All tests pass.

- [ ] **Step 2: Run lint**

Run: `npx nx lint ng-prism`
Expected: No errors.

- [ ] **Step 3: Run build**

Run: `npx nx build ng-prism`
Expected: Build succeeds.
