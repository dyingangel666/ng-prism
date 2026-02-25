import { join } from 'path';
import { writeFileSync, mkdirSync } from 'fs';
import type { BuilderContext } from '@angular-devkit/architect';
import type { StyleguidePage } from '../../plugin/page.types.js';
import { scan } from '../scanner/scanner.js';
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
}

export async function runPrismPipeline(
  options: PrismPipelineOptions,
  context: BuilderContext,
): Promise<PrismPipelineResult> {
  const { workspaceRoot } = context;

  context.reportStatus('Loading ng-prism config...');
  const config = await loadConfig({
    workspaceRoot,
    configFileName: options.configFile,
  });

  context.reportStatus('Scanning components...');
  const scanResult = scan({
    entryPoint: join(workspaceRoot, options.entryPoint),
  });

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
  writeFileSync(manifestPath, source, 'utf-8');

  const pageCount = (manifest.pages ?? []).length;

  context.reportStatus('');
  context.logger.info(
    `ng-prism: Generated manifest with ${manifest.components.length} component(s)` +
    (pageCount > 0 ? ` and ${pageCount} page(s)` : '') +
    ` → ${manifestPath}`,
  );

  return {
    manifestPath,
    componentCount: manifest.components.length,
    pageCount,
  };
}
