import { join, dirname } from 'path';
import { writeFileSync, readFileSync, mkdirSync, statSync, renameSync, existsSync, unlinkSync } from 'fs';
import ts from 'typescript';
import type { BuilderContext } from '@angular-devkit/architect';
import type { StyleguidePage } from '../../plugin/page.types.js';
import type { ScannedComponent, PrismManifest } from '../../plugin/plugin.types.js';
import { createScanner, type Scanner } from '../scanner/scanner.js';
import { discoverSecondaryEntryPoints } from '../scanner/entry-point-discovery.js';
import { loadConfig } from '../config-loader/config-loader.js';
import { runPluginHooks } from '../plugin-runner/plugin-runner.js';
import { generateRuntimeManifest } from '../manifest/runtime-manifest.generator.js';

export interface PrismPipelineOptions {
  entryPoint: string;
  libraryImportPath: string;
  prismProject: string;
  configFile: string;
}

export interface PrismPipelineResult {
  manifestPath: string;
  componentCount: number;
  pageCount: number;
  /** True if the manifest file was actually written; false if the existing content was identical. */
  written: boolean;
}

export interface PrismPipelineState {
  scanners: Map<string, Scanner>;
}

export function createPipelineState(): PrismPipelineState {
  return { scanners: new Map() };
}

export async function runPrismPipeline(
  options: PrismPipelineOptions,
  context: BuilderContext,
  state: PrismPipelineState,
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
  const manifest = await runPluginHooks(
    { ...scanResult, pages },
    config.plugins ?? [],
  );

  context.reportStatus('Generating runtime manifest...');
  const source = generateRuntimeManifest({
    components: manifest.components,
    libraryImportPath: options.libraryImportPath,
    pages: manifest.pages,
  });

  const projectMeta = await context.getProjectMetadata(options.prismProject);
  const sourceRoot = (projectMeta['sourceRoot'] as string | undefined)
    ?? join('projects', options.prismProject, 'src');
  const manifestPath = join(workspaceRoot, sourceRoot, 'prism-manifest.ts');

  mkdirSync(join(workspaceRoot, sourceRoot), { recursive: true });
  const written = writeManifestIfChanged(manifestPath, source);

  const pageCount = (manifest.pages ?? []).length;

  context.reportStatus('');
  context.logger.info(
    `ng-prism: ${written ? 'Generated' : 'Verified (unchanged)'} manifest ` +
    `with ${manifest.components.length} component(s)` +
    (pageCount > 0 ? ` and ${pageCount} page(s)` : '') +
    ` → ${manifestPath}`,
  );

  return {
    manifestPath,
    componentCount: manifest.components.length,
    pageCount,
    written,
  };
}

function writeManifestIfChanged(manifestPath: string, newContent: string): boolean {
  if (existsSync(manifestPath)) {
    const currentContent = readFileSync(manifestPath, 'utf-8');
    if (currentContent === newContent) {
      return false;
    }
  }

  const tempPath = manifestPath + '.tmp';
  writeFileSync(tempPath, newContent, 'utf-8');
  if (existsSync(manifestPath)) {
    unlinkSync(manifestPath);
  }
  renameSync(tempPath, manifestPath);
  return true;
}

function isDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

function resolveTsconfigPaths(entryPointDir: string): ts.CompilerOptions {
  const configPath = ts.findConfigFile(entryPointDir, ts.sys.fileExists, 'tsconfig.json');
  if (!configPath) return {};

  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
  if (configFile.error) return {};

  const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, dirname(configPath));
  const result: ts.CompilerOptions = {};
  if (parsed.options.paths) result.paths = parsed.options.paths;
  if (parsed.options.baseUrl) result.baseUrl = parsed.options.baseUrl;
  return result;
}

function scanEntryPoints(
  workspaceRoot: string,
  options: PrismPipelineOptions,
  state: PrismPipelineState,
): PrismManifest {
  const absoluteEntryPoint = join(workspaceRoot, options.entryPoint);
  const pathOptions = resolveTsconfigPaths(dirname(absoluteEntryPoint));

  if (!isDirectory(absoluteEntryPoint)) {
    return getOrCreateScanner(state, absoluteEntryPoint, pathOptions).scan();
  }

  const entryPoints = discoverSecondaryEntryPoints(
    absoluteEntryPoint,
    options.libraryImportPath,
  );

  const allComponents: ScannedComponent[] = [];

  for (const ep of entryPoints) {
    const scanner = getOrCreateScanner(state, ep.entryFile, pathOptions);
    const result = scanner.scan();
    for (const comp of result.components) {
      comp.importPath = ep.importPath;
      allComponents.push(comp);
    }
  }

  return { components: allComponents };
}

function getOrCreateScanner(
  state: PrismPipelineState,
  entryFile: string,
  compilerOptions: ts.CompilerOptions,
): Scanner {
  let scanner = state.scanners.get(entryFile);
  if (!scanner) {
    scanner = createScanner({ entryPoint: entryFile, compilerOptions });
    state.scanners.set(entryFile, scanner);
  }
  return scanner;
}
