import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { scanBundle } from './bundle-scanner.js';

describe('scanBundle', () => {
  const testDir = join(tmpdir(), 'ng-prism-perf-test-' + Date.now());

  beforeAll(() => {
    mkdirSync(testDir, { recursive: true });
  });

  afterAll(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  function writeFixture(name: string, content: string): string {
    const path = join(testDir, name);
    writeFileSync(path, content, 'utf-8');
    return path;
  }

  it('should calculate source size in bytes', () => {
    const path = writeFixture('size.ts', 'export const x = 42;\n');
    const result = scanBundle(path);
    expect(result.sourceSize).toBe(Buffer.byteLength('export const x = 42;\n', 'utf-8'));
  });

  it('should calculate gzip estimate smaller than source', () => {
    const content = 'export const x = "hello world";\n'.repeat(50);
    const path = writeFixture('gzip.ts', content);
    const result = scanBundle(path);
    expect(result.gzipEstimate).toBeLessThan(result.sourceSize);
    expect(result.gzipEstimate).toBeGreaterThan(0);
  });

  it('should extract import declarations', () => {
    const path = writeFixture('imports.ts', `
      import { Component } from '@angular/core';
      import { Observable } from 'rxjs';
      import { map } from 'rxjs/operators';

      export class Foo {}
    `);
    const result = scanBundle(path);
    expect(result.directImports).toBe(3);
    expect(result.importList).toEqual([
      '@angular/core',
      'rxjs',
      'rxjs/operators',
    ]);
  });

  it('should return treeDepth of 1 for files with no relative imports', () => {
    const path = writeFixture('no-rel.ts', `
      import { Component } from '@angular/core';
      export class Bar {}
    `);
    const result = scanBundle(path);
    expect(result.treeDepth).toBe(1);
  });

  it('should follow relative imports for tree depth', () => {
    writeFixture('child.ts', `export const val = 1;\n`);
    const path = writeFixture('parent.ts', `
      import { val } from './child.js';
      export const x = val;
    `);
    const result = scanBundle(path);
    expect(result.treeDepth).toBe(2);
  });

  it('should respect maxTreeDepth limit', () => {
    writeFixture('deep-c.ts', `export const c = 3;\n`);
    writeFixture('deep-b.ts', `import { c } from './deep-c.js';\nexport const b = c;\n`);
    const path = writeFixture('deep-a.ts', `import { b } from './deep-b.js';\nexport const a = b;\n`);
    const result = scanBundle(path, 2);
    expect(result.treeDepth).toBe(2);
  });

  it('should handle empty files', () => {
    const path = writeFixture('empty.ts', '');
    const result = scanBundle(path);
    expect(result.sourceSize).toBe(0);
    expect(result.directImports).toBe(0);
    expect(result.importList).toEqual([]);
  });

  it('should handle files with type imports', () => {
    const path = writeFixture('type-imports.ts', `
      import type { Type } from '@angular/core';
      export type Foo = Type<unknown>;
    `);
    const result = scanBundle(path);
    expect(result.directImports).toBe(1);
    expect(result.importList).toContain('@angular/core');
  });
});
