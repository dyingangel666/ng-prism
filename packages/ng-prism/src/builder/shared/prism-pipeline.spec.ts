import { mkdtempSync, cpSync, rmSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { runPrismPipeline } from './prism-pipeline.js';

const FIXTURES_DIR = join(__dirname, '..', 'scanner', '__fixtures__');
const CONFIG_FIXTURE = join(__dirname, '__fixtures__', 'ng-prism.config.ts');

function createTempWorkspace(): string {
  const tmp = mkdtempSync(join(tmpdir(), 'ng-prism-pipeline-'));
  cpSync(FIXTURES_DIR, join(tmp, 'lib'), { recursive: true });
  cpSync(CONFIG_FIXTURE, join(tmp, 'ng-prism.config.ts'));
  return tmp;
}

function createMockContext(workspaceRoot: string, sourceRoot?: string) {
  return {
    workspaceRoot,
    reportStatus: jest.fn(),
    logger: { info: jest.fn() },
    getProjectMetadata: jest.fn().mockResolvedValue(
      sourceRoot !== undefined ? { sourceRoot } : {},
    ),
  } as never;
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
    const ctx = createMockContext(tmp, 'prism-app/src');

    const result = await runPrismPipeline(defaultOptions, ctx);

    expect(result.componentCount).toBe(4);
  });

  it('should write prism-manifest.ts to expected path', async () => {
    tmp = createTempWorkspace();
    const ctx = createMockContext(tmp, 'prism-app/src');

    const result = await runPrismPipeline(defaultOptions, ctx);

    expect(existsSync(result.manifestPath)).toBe(true);
    expect(result.manifestPath).toBe(join(tmp, 'prism-app', 'src', 'prism-manifest.ts'));
  });

  it('should generate manifest with component imports', async () => {
    tmp = createTempWorkspace();
    const ctx = createMockContext(tmp, 'prism-app/src');

    await runPrismPipeline(defaultOptions, ctx);

    const content = readFileSync(join(tmp, 'prism-app', 'src', 'prism-manifest.ts'), 'utf-8');
    expect(content).toContain("import { ButtonComponent, CardComponent, SignalButtonComponent, ModelInputComponent } from 'my-lib'");
  });

  it('should include component type references (not strings)', async () => {
    tmp = createTempWorkspace();
    const ctx = createMockContext(tmp, 'prism-app/src');

    await runPrismPipeline(defaultOptions, ctx);

    const content = readFileSync(join(tmp, 'prism-app', 'src', 'prism-manifest.ts'), 'utf-8');
    expect(content).toContain('type: ButtonComponent,');
    expect(content).toContain('type: CardComponent,');
    expect(content).toContain('type: SignalButtonComponent,');
  });

  it('should use fallback sourceRoot when metadata is empty', async () => {
    tmp = createTempWorkspace();
    const ctx = createMockContext(tmp);

    const result = await runPrismPipeline(defaultOptions, ctx);

    expect(result.manifestPath).toBe(
      join(tmp, 'projects', 'my-lib-prism', 'src', 'prism-manifest.ts'),
    );
    expect(existsSync(result.manifestPath)).toBe(true);
  });

  it('should call reportStatus and logger.info', async () => {
    tmp = createTempWorkspace();
    const ctx = createMockContext(tmp, 'prism-app/src');

    await runPrismPipeline(defaultOptions, ctx);

    expect(ctx.reportStatus).toHaveBeenCalledWith('Loading ng-prism config...');
    expect(ctx.reportStatus).toHaveBeenCalledWith('Scanning components...');
    expect(ctx.reportStatus).toHaveBeenCalledWith('Running plugin hooks...');
    expect(ctx.reportStatus).toHaveBeenCalledWith('Generating runtime manifest...');
    expect(ctx.reportStatus).toHaveBeenCalledWith('');
    expect(ctx.logger.info).toHaveBeenCalledWith(
      expect.stringContaining('Generated manifest with 4 component(s)'),
    );
  });
});
