import {
  mkdtempSync,
  cpSync,
  rmSync,
  existsSync,
  readFileSync,
  statSync,
} from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import type { BuilderContext } from '@angular-devkit/architect';
import { runPrismPipeline, createPipelineState } from './prism-pipeline.js';

const FIXTURES_DIR = join(__dirname, '..', 'scanner', '__fixtures__');
const MULTI_ENTRY_FIXTURES_DIR = join(
  __dirname,
  '__fixtures__',
  'multi-entry-lib'
);
const CONFIG_FIXTURE = join(__dirname, '__fixtures__', 'ng-prism.config.ts');

function createTempWorkspace(): string {
  const tmp = mkdtempSync(join(tmpdir(), 'ng-prism-pipeline-'));
  cpSync(FIXTURES_DIR, join(tmp, 'lib'), { recursive: true });
  cpSync(CONFIG_FIXTURE, join(tmp, 'ng-prism.config.ts'));
  return tmp;
}

function createMultiEntryWorkspace(): string {
  const tmp = mkdtempSync(join(tmpdir(), 'ng-prism-pipeline-multi-'));
  cpSync(MULTI_ENTRY_FIXTURES_DIR, join(tmp, 'lib'), { recursive: true });
  cpSync(CONFIG_FIXTURE, join(tmp, 'ng-prism.config.ts'));
  return tmp;
}

function createMockContext(workspaceRoot: string) {
  return {
    workspaceRoot,
    reportStatus: jest.fn(),
    logger: { info: jest.fn() },
  } as unknown as BuilderContext;
}

describe('runPrismPipeline integration', () => {
  let tmp: string;

  afterEach(() => {
    if (tmp && existsSync(tmp)) {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  const defaultOptions = {
    entryPoint: 'lib/public-api.ts',
    libraryImportPath: 'my-lib',
    prismProject: 'my-lib-prism',
    configFile: 'ng-prism.config.ts',
  };

  it('should return correct componentCount', async () => {
    tmp = createTempWorkspace();
    const ctx = createMockContext(tmp);

    const result = await runPrismPipeline(
      defaultOptions,
      ctx,
      createPipelineState()
    );

    expect(result.componentCount).toBe(7);
  });

  it('should write prism-manifest.ts to expected path', async () => {
    tmp = createTempWorkspace();
    const ctx = createMockContext(tmp);

    const result = await runPrismPipeline(
      defaultOptions,
      ctx,
      createPipelineState()
    );

    expect(existsSync(result.manifestPath)).toBe(true);
    expect(result.manifestPath).toBe(
      join(tmp, '.ng-prism', 'my-lib-prism', 'prism-manifest.ts')
    );
  });

  it('should generate manifest with component imports', async () => {
    tmp = createTempWorkspace();
    const ctx = createMockContext(tmp);

    await runPrismPipeline(defaultOptions, ctx, createPipelineState());

    const content = readFileSync(
      join(tmp, '.ng-prism', 'my-lib-prism', 'prism-manifest.ts'),
      'utf-8'
    );
    expect(content).toContain(
      "import { ButtonComponent, CardComponent, SignalButtonComponent, ModelInputComponent, HighlightDirective, InvalidBgComponent, InvalidStatusComponent } from 'my-lib'"
    );
  });

  it('should include component type references (not strings)', async () => {
    tmp = createTempWorkspace();
    const ctx = createMockContext(tmp);

    await runPrismPipeline(defaultOptions, ctx, createPipelineState());

    const content = readFileSync(
      join(tmp, '.ng-prism', 'my-lib-prism', 'prism-manifest.ts'),
      'utf-8'
    );
    expect(content).toContain('type: ButtonComponent,');
    expect(content).toContain('type: CardComponent,');
    expect(content).toContain('type: SignalButtonComponent,');
  });

  it('should write to default cache path when cacheDir option is undefined', async () => {
    tmp = createTempWorkspace();
    const ctx = createMockContext(tmp);

    const result = await runPrismPipeline(
      defaultOptions,
      ctx,
      createPipelineState()
    );

    expect(result.manifestPath).toBe(
      join(tmp, '.ng-prism', 'my-lib-prism', 'prism-manifest.ts')
    );
    expect(existsSync(result.manifestPath)).toBe(true);
  });

  it('should write to cacheDir override when provided', async () => {
    tmp = createTempWorkspace();
    const ctx = createMockContext(tmp);
    const customCacheDir = join(tmp, '.custom-cache');

    const result = await runPrismPipeline(
      { ...defaultOptions, cacheDir: customCacheDir },
      ctx,
      createPipelineState()
    );

    expect(result.manifestPath).toBe(join(customCacheDir, 'prism-manifest.ts'));
    expect(existsSync(result.manifestPath)).toBe(true);
  });

  it('should call reportStatus and logger.info', async () => {
    tmp = createTempWorkspace();
    const ctx = createMockContext(tmp);

    await runPrismPipeline(defaultOptions, ctx, createPipelineState());

    expect(ctx.reportStatus).toHaveBeenCalledWith('Loading ng-prism config...');
    expect(ctx.reportStatus).toHaveBeenCalledWith('Scanning components...');
    expect(ctx.reportStatus).toHaveBeenCalledWith('Running plugin hooks...');
    expect(ctx.reportStatus).toHaveBeenCalledWith(
      'Generating runtime manifest...'
    );
    expect(ctx.reportStatus).toHaveBeenCalledWith('');
    expect(ctx.logger.info).toHaveBeenCalledWith(
      expect.stringContaining('Generated manifest with 7 component(s)')
    );
  });
});

describe('runPrismPipeline multi-entry-point integration', () => {
  let tmp: string;

  afterEach(() => {
    if (tmp && existsSync(tmp)) {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  const multiOptions = {
    entryPoint: 'lib',
    libraryImportPath: 'multi-entry-lib',
    prismProject: 'my-lib-prism',
    configFile: 'ng-prism.config.ts',
  };

  it('should discover and scan secondary entry points', async () => {
    tmp = createMultiEntryWorkspace();
    const ctx = createMockContext(tmp);

    const result = await runPrismPipeline(
      multiOptions,
      ctx,
      createPipelineState()
    );

    expect(result.componentCount).toBe(2);
  });

  it('should generate grouped imports per entry point', async () => {
    tmp = createMultiEntryWorkspace();
    const ctx = createMockContext(tmp);

    await runPrismPipeline(multiOptions, ctx, createPipelineState());

    const content = readFileSync(
      join(tmp, '.ng-prism', 'my-lib-prism', 'prism-manifest.ts'),
      'utf-8'
    );
    expect(content).toContain("from 'multi-entry-lib/atoms/icon'");
    expect(content).toContain("from 'multi-entry-lib/atoms/pill'");
    expect(content).not.toContain("from 'multi-entry-lib';");
  });

  it('should include component type references', async () => {
    tmp = createMultiEntryWorkspace();
    const ctx = createMockContext(tmp);

    await runPrismPipeline(multiOptions, ctx, createPipelineState());

    const content = readFileSync(
      join(tmp, '.ng-prism', 'my-lib-prism', 'prism-manifest.ts'),
      'utf-8'
    );
    expect(content).toContain('type: PillComponent,');
    expect(content).toContain('type: IconComponent,');
  });

  it('should auto-detect library root from a file entryPoint and discover secondaries', async () => {
    tmp = createMultiEntryWorkspace();
    const ctx = createMockContext(tmp);

    const result = await runPrismPipeline(
      { ...multiOptions, entryPoint: 'lib/public-api.ts' },
      ctx,
      createPipelineState()
    );

    expect(result.componentCount).toBe(2);

    const content = readFileSync(
      join(tmp, '.ng-prism', 'my-lib-prism', 'prism-manifest.ts'),
      'utf-8'
    );
    expect(content).toContain("from 'multi-entry-lib/atoms/icon'");
    expect(content).toContain("from 'multi-entry-lib/atoms/pill'");
    expect(content).not.toContain("from 'multi-entry-lib';");
  });
});

describe('createPipelineState', () => {
  it('should return independent state objects', () => {
    const a = createPipelineState();
    const b = createPipelineState();

    expect(a).not.toBe(b);
    expect(a.scanner).toBeUndefined();
    expect(b.scanner).toBeUndefined();
    expect(a.lastEntrySetKey).toBeUndefined();
    expect(b.lastEntrySetKey).toBeUndefined();
  });

  it('should populate scanner state after pipeline run', async () => {
    const tmp = createTempWorkspace();
    const ctx = createMockContext(tmp);
    const state = createPipelineState();

    try {
      await runPrismPipeline(
        {
          entryPoint: 'lib/public-api.ts',
          libraryImportPath: 'my-lib',
          prismProject: 'my-lib-prism',
          configFile: 'ng-prism.config.ts',
        },
        ctx,
        state
      );

      expect(state.scanner).toBeDefined();
      expect(state.lastEntrySetKey).toBeDefined();
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('should reuse the same scanner across pipeline invocations', async () => {
    const tmp = createTempWorkspace();
    const ctx = createMockContext(tmp);
    const state = createPipelineState();

    try {
      const options = {
        entryPoint: 'lib/public-api.ts',
        libraryImportPath: 'my-lib',
        prismProject: 'my-lib-prism',
        configFile: 'ng-prism.config.ts',
      };

      await runPrismPipeline(options, ctx, state);
      const firstScanner = state.scanner;

      await runPrismPipeline(options, ctx, state);
      const secondScanner = state.scanner;

      expect(firstScanner).toBeDefined();
      expect(secondScanner).toBe(firstScanner);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});

describe('runPrismPipeline skip-write behavior', () => {
  it('should return written: true on first invocation', async () => {
    const tmp = createTempWorkspace();
    const ctx = createMockContext(tmp);

    try {
      const result = await runPrismPipeline(
        {
          entryPoint: 'lib/public-api.ts',
          libraryImportPath: 'my-lib',
          prismProject: 'my-lib-prism',
          configFile: 'ng-prism.config.ts',
        },
        ctx,
        createPipelineState()
      );

      expect(result.written).toBe(true);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('should return written: false when content is unchanged', async () => {
    const tmp = createTempWorkspace();
    const ctx = createMockContext(tmp);
    const state = createPipelineState();
    const options = {
      entryPoint: 'lib/public-api.ts',
      libraryImportPath: 'my-lib',
      prismProject: 'my-lib-prism',
      configFile: 'ng-prism.config.ts',
    };

    try {
      await runPrismPipeline(options, ctx, state);
      const second = await runPrismPipeline(options, ctx, state);

      expect(second.written).toBe(false);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('should leave file mtime unchanged when skip-write triggers', async () => {
    const tmp = createTempWorkspace();
    const ctx = createMockContext(tmp);
    const state = createPipelineState();
    const options = {
      entryPoint: 'lib/public-api.ts',
      libraryImportPath: 'my-lib',
      prismProject: 'my-lib-prism',
      configFile: 'ng-prism.config.ts',
    };

    try {
      const first = await runPrismPipeline(options, ctx, state);
      const mtimeAfterFirst = statSync(first.manifestPath).mtimeMs;

      await new Promise((resolve) => setTimeout(resolve, 20));

      await runPrismPipeline(options, ctx, state);
      const mtimeAfterSecond = statSync(first.manifestPath).mtimeMs;

      expect(mtimeAfterSecond).toBe(mtimeAfterFirst);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('should log "Generated" when written, "Verified (unchanged)" when skipped', async () => {
    const tmp = createTempWorkspace();
    const ctx = createMockContext(tmp);
    const state = createPipelineState();
    const options = {
      entryPoint: 'lib/public-api.ts',
      libraryImportPath: 'my-lib',
      prismProject: 'my-lib-prism',
      configFile: 'ng-prism.config.ts',
    };

    try {
      await runPrismPipeline(options, ctx, state);
      expect(ctx.logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Generated manifest')
      );

      (ctx.logger.info as jest.Mock).mockClear();

      await runPrismPipeline(options, ctx, state);
      expect(ctx.logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Verified (unchanged) manifest')
      );
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});
