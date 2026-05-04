import { stripShowcaseDecorators } from './showcase-strip.transformer.js';

describe('stripShowcaseDecorators', () => {
  describe('lowered call form', () => {
    it('should remove Showcase call and its import', () => {
      const input = [
        "import { Showcase } from '@ng-prism/core';",
        "import { Component } from '@angular/core';",
        "class MyComponent {}",
        "Showcase({ title: 'Test', category: 'Demo' })(MyComponent);",
      ].join('\n');

      const result = stripShowcaseDecorators(input);

      expect(result).not.toContain('Showcase');
      expect(result).not.toContain('@ng-prism/core');
      expect(result).toContain('class MyComponent');
      expect(result).toContain('@angular/core');
    });
  });

  describe('__decorate form — Showcase only', () => {
    it('should remove entire __decorate statement when only Showcase remains', () => {
      const input = [
        "import { Showcase } from '@ng-prism/core';",
        "class MyComponent {}",
        "MyComponent = __decorate([Showcase({ title: 'Test' })], MyComponent);",
      ].join('\n');

      const result = stripShowcaseDecorators(input);

      expect(result).not.toContain('Showcase');
      expect(result).not.toContain('__decorate');
      expect(result).not.toContain('@ng-prism/core');
      expect(result).toContain('class MyComponent');
    });
  });

  describe('__decorate form — mixed decorators', () => {
    it('should remove only Showcase from __decorate array', () => {
      const input = [
        "import { Showcase } from '@ng-prism/core';",
        "class MyComponent {}",
        "MyComponent = __decorate([Showcase({ title: 'Test' }), OtherDecorator()], MyComponent);",
      ].join('\n');

      const result = stripShowcaseDecorators(input);

      expect(result).not.toContain('Showcase');
      expect(result).not.toContain('@ng-prism/core');
      expect(result).toContain('__decorate');
      expect(result).toContain('OtherDecorator');
      expect(result).toContain('class MyComponent');
    });
  });

  describe('native decorator form', () => {
    it('should remove @Showcase but keep @Component', () => {
      const input = [
        "import { Showcase } from '@ng-prism/core';",
        "import { Component } from '@angular/core';",
        "@Showcase({ title: 'Test' })",
        "@Component({ selector: 'my-comp' })",
        "class MyComponent {}",
      ].join('\n');

      const result = stripShowcaseDecorators(input);

      expect(result).not.toContain('Showcase');
      expect(result).not.toContain('@ng-prism/core');
      expect(result).toContain('@Component');
      expect(result).toContain('class MyComponent');
    });
  });

  describe('import cleanup — sole import', () => {
    it('should remove entire import statement when Showcase is the only specifier', () => {
      const input = [
        "import { Showcase } from '@ng-prism/core';",
        "Showcase({ title: 'Test' })(MyComponent);",
        "class MyComponent {}",
      ].join('\n');

      const result = stripShowcaseDecorators(input);

      expect(result).not.toContain('import');
      expect(result).not.toContain('@ng-prism/core');
    });
  });

  describe('import cleanup — partial', () => {
    it('should remove only Showcase specifier when other imports remain', () => {
      const input = [
        "import { Showcase, defineConfig } from '@ng-prism/core';",
        "Showcase({ title: 'Test' })(MyComponent);",
        "class MyComponent {}",
        "const c = defineConfig({ plugins: [] });",
      ].join('\n');

      const result = stripShowcaseDecorators(input);

      expect(result).not.toContain('Showcase');
      expect(result).toContain('defineConfig');
      expect(result).toContain('@ng-prism/core');
    });
  });

  describe('aliased import', () => {
    it('should handle import { Showcase as S } and track local name', () => {
      const input = [
        "import { Showcase as S } from '@ng-prism/core';",
        "S({ title: 'Test' })(MyComponent);",
        "class MyComponent {}",
      ].join('\n');

      const result = stripShowcaseDecorators(input);

      expect(result).not.toContain('Showcase');
      expect(result).not.toContain('@ng-prism/core');
      expect(result).not.toContain(' S(');
      expect(result).toContain('class MyComponent');
    });
  });

  describe('no-op — file without Showcase', () => {
    it('should return source unchanged when no Showcase import exists', () => {
      const input = [
        "import { Component } from '@angular/core';",
        "@Component({ selector: 'my-comp' })",
        "class MyComponent {}",
      ].join('\n');

      const result = stripShowcaseDecorators(input);

      expect(result).toBe(input);
    });
  });

  describe('idempotency', () => {
    it('should produce identical output when run twice', () => {
      const input = [
        "import { Showcase } from '@ng-prism/core';",
        "Showcase({ title: 'Test' })(MyComponent);",
        "class MyComponent {}",
      ].join('\n');

      const first = stripShowcaseDecorators(input);
      const second = stripShowcaseDecorators(first);

      expect(second).toBe(first);
    });
  });

  describe('subpath import', () => {
    it('should recognize import from ng-prism subpath', () => {
      const input = [
        "import { Showcase } from '@ng-prism/core/decorator';",
        "Showcase({ title: 'Test' })(MyComponent);",
        "class MyComponent {}",
      ].join('\n');

      const result = stripShowcaseDecorators(input);

      expect(result).not.toContain('Showcase');
      expect(result).not.toContain('@ng-prism/core');
    });
  });
});
