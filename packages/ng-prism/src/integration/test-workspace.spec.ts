import {
  mkdtempSync,
  cpSync,
  rmSync,
  existsSync,
  readFileSync,
  mkdirSync,
  writeFileSync,
} from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import type { BuilderContext } from '@angular-devkit/architect';
import { runPrismPipeline, createPipelineState } from '../builder/shared/prism-pipeline.js';

const TEST_WORKSPACE_DIR = join(__dirname, '..', '..', '..', '..', 'test-workspace');

function createTempWorkspace(): string {
  const tmp = mkdtempSync(join(tmpdir(), 'ng-prism-integration-'));
  cpSync(TEST_WORKSPACE_DIR, tmp, { recursive: true });

  mkdirSync(join(tmp, 'projects', 'test-lib-prism', 'src'), { recursive: true });
  writeFileSync(
    join(tmp, 'projects', 'test-lib-prism', 'src', 'main.ts'),
    'export {};\n',
    'utf-8',
  );

  const angularJson = JSON.parse(readFileSync(join(tmp, 'angular.json'), 'utf-8'));
  angularJson.projects['test-lib-prism'] = {
    projectType: 'application',
    root: 'projects/test-lib-prism',
    sourceRoot: 'projects/test-lib-prism/src',
    architect: {
      'prism-serve': {
        builder: 'ng-prism:serve',
        options: { libraryProject: 'test-lib' },
      },
      'prism-build': {
        builder: 'ng-prism:build',
        options: { libraryProject: 'test-lib' },
      },
    },
  };
  writeFileSync(join(tmp, 'angular.json'), JSON.stringify(angularJson, null, 2), 'utf-8');

  writeFileSync(
    join(tmp, 'ng-prism.config.ts'),
    [
      'export default {',
      '  plugins: [',
      '    {',
      "      name: 'test-integration-plugin',",
      '      onComponentScanned(component: Record<string, unknown>) {',
      "        const meta = component['meta'] as Record<string, unknown> ?? {};",
      "        meta['tested'] = true;",
      '        return Object.assign({}, component, { meta });',
      '      },',
      '    },',
      '  ],',
      '};',
    ].join('\n'),
    'utf-8',
  );

  return tmp;
}

function createMockContext(workspaceRoot: string) {
  return {
    workspaceRoot,
    reportStatus: jest.fn(),
    logger: { info: jest.fn() },
    getProjectMetadata: jest.fn().mockResolvedValue({
      sourceRoot: 'projects/test-lib-prism/src',
    }),
  } as unknown as BuilderContext;
}

describe('test-workspace integration', () => {
  let tmp: string;

  afterEach(() => {
    if (tmp && existsSync(tmp)) {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  const pipelineOptions = {
    entryPoint: 'projects/test-lib/src/public-api.ts',
    libraryImportPath: 'test-lib',
    prismProject: 'test-lib-prism',
    configFile: 'ng-prism.config.ts',
  };

  it('should discover only @Showcase components from the library', async () => {
    tmp = createTempWorkspace();
    const ctx = createMockContext(tmp);

    const result = await runPrismPipeline(pipelineOptions, ctx, createPipelineState());

    expect(result.componentCount).toBe(14);
  });

  it('should write prism-manifest.ts into prism project', async () => {
    tmp = createTempWorkspace();
    const ctx = createMockContext(tmp);

    await runPrismPipeline(pipelineOptions, ctx, createPipelineState());

    expect(existsSync(join(tmp, 'projects', 'test-lib-prism', 'src', 'prism-manifest.ts'))).toBe(true);
  });

  it('should generate correct import statement', async () => {
    tmp = createTempWorkspace();
    const ctx = createMockContext(tmp);

    await runPrismPipeline(pipelineOptions, ctx, createPipelineState());

    const content = readFileSync(
      join(tmp, 'projects', 'test-lib-prism', 'src', 'prism-manifest.ts'),
      'utf-8',
    );
    expect(content).toContain("from 'test-lib'");
    expect(content).toContain('ButtonComponent');
  });

  it('should include component type references', async () => {
    tmp = createTempWorkspace();
    const ctx = createMockContext(tmp);

    await runPrismPipeline(pipelineOptions, ctx, createPipelineState());

    const content = readFileSync(
      join(tmp, 'projects', 'test-lib-prism', 'src', 'prism-manifest.ts'),
      'utf-8',
    );
    expect(content).toContain('type: ButtonComponent,');
  });

  it('should exclude non-showcased components', async () => {
    tmp = createTempWorkspace();
    const ctx = createMockContext(tmp);

    await runPrismPipeline(pipelineOptions, ctx, createPipelineState());

    const content = readFileSync(
      join(tmp, 'projects', 'test-lib-prism', 'src', 'prism-manifest.ts'),
      'utf-8',
    );
    expect(content).not.toContain('InternalComponent');
  });

  it('should preserve showcase metadata in manifest', async () => {
    tmp = createTempWorkspace();
    const ctx = createMockContext(tmp);

    await runPrismPipeline(pipelineOptions, ctx, createPipelineState());

    const content = readFileSync(
      join(tmp, 'projects', 'test-lib-prism', 'src', 'prism-manifest.ts'),
      'utf-8',
    );
    expect(content).toContain('title: "Button"');
    expect(content).toContain('category: "Inputs"');
    expect(content).toContain('variants:');
    expect(content).toContain('selector: "lib-button"');
    expect(content).toContain('standalone: true');
  });

  it('should apply plugin hooks from config', async () => {
    tmp = createTempWorkspace();
    const ctx = createMockContext(tmp);

    const result = await runPrismPipeline(pipelineOptions, ctx, createPipelineState());

    expect(result.componentCount).toBe(14);
    expect(ctx.reportStatus).toHaveBeenCalledWith('Loading ng-prism config...');
    expect(ctx.reportStatus).toHaveBeenCalledWith('Running plugin hooks...');
    expect(ctx.logger.info).toHaveBeenCalledWith(
      expect.stringContaining('Generated manifest with 14 component(s)'),
    );
  });
});
