import { join, dirname } from 'path';
import {
  writeFileSync,
  readFileSync,
  mkdirSync,
  statSync,
  renameSync,
  existsSync,
  unlinkSync,
} from 'fs';
import ts from 'typescript';
import type { BuilderContext } from '@angular-devkit/architect';
import type { StyleguidePage } from '../../plugin/page.types.js';
import type { PrismManifest } from '../../plugin/plugin.types.js';
import { createScanner, type Scanner } from '../scanner/scanner.js';
import type { EntryPointInput } from '../scanner/entry-point.scanner.js';
import { discoverSecondaryEntryPoints } from '../scanner/entry-point-discovery.js';
import { loadConfig } from '../config-loader/config-loader.js';
import { runPluginHooks } from '../plugin-runner/plugin-runner.js';
import { generateRuntimeManifest } from '../manifest/runtime-manifest.generator.js';
import {
  DEFAULT_A11Y_REPORT_PATH,
  checkA11yThresholds,
  readA11yMeta,
} from '../a11y/a11y-report-reader.js';

export interface PrismPipelineOptions {
  entryPoint: string;
  libraryImportPath: string;
  prismProject: string;
  configFile: string;
  cacheDir?: string;
}

export interface PrismPipelineResult {
  manifestPath: string;
  componentCount: number;
  pageCount: number;
  /** True if the manifest file was actually written; false if the existing content was identical. */
  written: boolean;
}

export interface PrismPipelineState {
  scanner: Scanner | undefined;
  /** Sorted, joined entry-file paths — used to detect when the entry set changed between rebuilds. */
  lastEntrySetKey: string | undefined;
}

export function createPipelineState(): PrismPipelineState {
  return { scanner: undefined, lastEntrySetKey: undefined };
}

export async function runPrismPipeline(
  options: PrismPipelineOptions,
  context: BuilderContext,
  state: PrismPipelineState
): Promise<PrismPipelineResult> {
  const { workspaceRoot } = context;

  context.reportStatus('Loading ng-prism config...');
  const config = await loadConfig({
    workspaceRoot,
    configFileName: options.configFile,
  });

  context.reportStatus('Scanning components...');
  const scanResult = scanEntryPoints(workspaceRoot, options, state);

  const pages: StyleguidePage[] = config.pages ? [...config.pages] : [];

  context.reportStatus('Running plugin hooks...');
  let manifest = await runPluginHooks(
    { ...scanResult, pages },
    config.plugins ?? []
  );

  const a11yReportPath = config.a11y?.reportPath ?? DEFAULT_A11Y_REPORT_PATH;
  const a11yMeta = readA11yMeta(
    join(workspaceRoot, a11yReportPath),
    config.a11y?.thresholds
  );
  if (a11yMeta) {
    const violations = checkA11yThresholds(a11yMeta);
    if (violations.length > 0) {
      const summary = violations
        .map((v) => `${v.metric}: ${v.actual} (threshold ${v.threshold})`)
        .join(', ');
      throw new Error(
        `ng-prism: a11y thresholds violated — ${summary}. ` +
          `Update components or relax thresholds via config.a11y.thresholds.`
      );
    }
    manifest = {
      ...manifest,
      meta: { ...manifest.meta, a11y: a11yMeta },
    };
  }

  context.reportStatus('Generating runtime manifest...');
  const source = generateRuntimeManifest({
    components: manifest.components,
    libraryImportPath: options.libraryImportPath,
    pages: manifest.pages,
    meta: manifest.meta,
  });

  const cacheDir =
    options.cacheDir ??
    join(
      workspaceRoot,
      'node_modules',
      '.cache',
      'ng-prism',
      options.prismProject
    );
  const manifestPath = join(cacheDir, 'prism-manifest.ts');

  mkdirSync(cacheDir, { recursive: true });
  const written = writeManifestIfChanged(manifestPath, source);

  const pageCount = (manifest.pages ?? []).length;

  context.reportStatus('');
  context.logger.info(
    `ng-prism: ${written ? 'Generated' : 'Verified (unchanged)'} manifest ` +
      `with ${manifest.components.length} component(s)` +
      (pageCount > 0 ? ` and ${pageCount} page(s)` : '') +
      ` → ${manifestPath}`
  );

  return {
    manifestPath,
    componentCount: manifest.components.length,
    pageCount,
    written,
  };
}

function writeManifestIfChanged(
  manifestPath: string,
  newContent: string
): boolean {
  if (existsSync(manifestPath)) {
    const currentContent = readFileSync(manifestPath, 'utf-8');
    if (currentContent === newContent) {
      return false;
    }
  }

  const tempPath = manifestPath + '.tmp';
  writeFileSync(tempPath, newContent, 'utf-8');
  try {
    renameSync(tempPath, manifestPath);
  } catch (err) {
    if (existsSync(tempPath)) {
      try {
        unlinkSync(tempPath);
      } catch {
        /* best-effort cleanup */
      }
    }
    throw err;
  }
  return true;
}

function isDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

function findLibraryRoot(filePath: string): string | undefined {
  let dir = dirname(filePath);
  let parent = dirname(dir);
  while (dir !== parent) {
    if (existsSync(join(dir, 'ng-package.json'))) {
      return dir;
    }
    dir = parent;
    parent = dirname(dir);
  }
  return undefined;
}

function resolveTsconfigPaths(entryPointDir: string): ts.CompilerOptions {
  const configPath = ts.findConfigFile(
    entryPointDir,
    ts.sys.fileExists,
    'tsconfig.json'
  );
  if (!configPath) return {};

  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
  if (configFile.error) return {};

  const parsed = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    dirname(configPath)
  );
  const result: ts.CompilerOptions = {};
  if (parsed.options.paths) result.paths = parsed.options.paths;
  if (parsed.options.baseUrl) result.baseUrl = parsed.options.baseUrl;
  return result;
}

function resolveEntryPoints(
  workspaceRoot: string,
  options: PrismPipelineOptions
): { entryPoints: EntryPointInput[]; compilerOptions: ts.CompilerOptions } {
  const absoluteEntryPoint = join(workspaceRoot, options.entryPoint);
  const compilerOptions = resolveTsconfigPaths(dirname(absoluteEntryPoint));

  const entryIsDirectory = isDirectory(absoluteEntryPoint);
  const libraryRoot = entryIsDirectory
    ? absoluteEntryPoint
    : findLibraryRoot(absoluteEntryPoint);

  const discovered = libraryRoot
    ? discoverSecondaryEntryPoints(libraryRoot, options.libraryImportPath)
    : [];

  // Fallback to a direct file scan when:
  //  - the entry is a file and no ng-package.json was found above it, OR
  //  - the entry is a file with an ng-package.json above it but discovery found nothing
  //    (e.g. primary-only library, root ng-package.json carries `dest`).
  const entryPoints: EntryPointInput[] =
    discovered.length === 0 && !entryIsDirectory
      ? [
          {
            entryFile: absoluteEntryPoint,
            importPath: options.libraryImportPath,
          },
        ]
      : discovered;

  return { entryPoints, compilerOptions };
}

function scanEntryPoints(
  workspaceRoot: string,
  options: PrismPipelineOptions,
  state: PrismPipelineState
): PrismManifest {
  const { entryPoints, compilerOptions } = resolveEntryPoints(
    workspaceRoot,
    options
  );

  const newKey = entryPoints
    .map((e) => e.entryFile)
    .slice()
    .sort()
    .join('|');

  if (newKey !== state.lastEntrySetKey) {
    state.scanner = undefined;
    state.lastEntrySetKey = newKey;
  }

  state.scanner ??= createScanner({ entryPoints, compilerOptions });

  return state.scanner.scan();
}
