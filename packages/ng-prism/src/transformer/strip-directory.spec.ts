import { mkdtemp, writeFile, readFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { stripShowcaseFromDirectory } from './strip-directory.js';

describe('stripShowcaseFromDirectory', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'ng-prism-strip-'));
  });

  it('should strip Showcase from .mjs files and leave others unchanged', async () => {
    const withShowcase = [
      "import { Showcase } from '@ng-prism/core';",
      "class MyComp {}",
      "Showcase({ title: 'Test' })(MyComp);",
    ].join('\n');
    const withoutShowcase = [
      "import { Component } from '@angular/core';",
      "class OtherComp {}",
    ].join('\n');

    await writeFile(join(tmpDir, 'comp-a.mjs'), withShowcase, 'utf-8');
    await writeFile(join(tmpDir, 'comp-b.mjs'), withoutShowcase, 'utf-8');

    const result = await stripShowcaseFromDirectory(tmpDir);

    expect(result.totalFiles).toBe(2);
    expect(result.strippedFiles).toBe(1);

    const strippedContent = await readFile(join(tmpDir, 'comp-a.mjs'), 'utf-8');
    expect(strippedContent).not.toContain('@ng-prism/core');
    expect(strippedContent).not.toContain('Showcase');
    expect(strippedContent).toContain('class MyComp');

    const unchangedContent = await readFile(join(tmpDir, 'comp-b.mjs'), 'utf-8');
    expect(unchangedContent).toBe(withoutShowcase);
  });

  it('should process files in subdirectories', async () => {
    const withShowcase = [
      "import { Showcase } from '@ng-prism/core';",
      "Showcase({ title: 'Sub' })(SubComp);",
      "class SubComp {}",
    ].join('\n');

    await mkdir(join(tmpDir, 'fesm2022'), { recursive: true });
    await writeFile(join(tmpDir, 'fesm2022', 'bundle.mjs'), withShowcase, 'utf-8');

    const result = await stripShowcaseFromDirectory(tmpDir);

    expect(result.strippedFiles).toBe(1);
    const content = await readFile(join(tmpDir, 'fesm2022', 'bundle.mjs'), 'utf-8');
    expect(content).not.toContain('Showcase');
  });

  it('should ignore non-js files', async () => {
    await writeFile(join(tmpDir, 'readme.md'), '# Hello', 'utf-8');
    await writeFile(join(tmpDir, 'data.json'), '{}', 'utf-8');

    const result = await stripShowcaseFromDirectory(tmpDir);

    expect(result.totalFiles).toBe(0);
    expect(result.strippedFiles).toBe(0);
  });
});
