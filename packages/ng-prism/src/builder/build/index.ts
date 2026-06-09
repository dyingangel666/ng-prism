import { createBuilder, type Builder, type BuilderContext, type BuilderOutput } from '@angular-devkit/architect';
import type { json } from '@angular-devkit/core';
import { join, isAbsolute } from 'path';
import type { BuildBuilderSchema } from './schema.js';
import { runPrismPipeline, createPipelineState, type PrismPipelineOptions } from '../shared/prism-pipeline.js';

async function createBuildBuilder(
  options: BuildBuilderSchema,
  context: BuilderContext,
): Promise<BuilderOutput> {
  const cacheDir = options.cacheDir
    ? isAbsolute(options.cacheDir)
      ? options.cacheDir
      : join(context.workspaceRoot, options.cacheDir)
    : undefined;

  const pipelineOptions: PrismPipelineOptions = {
    entryPoint: options.entryPoint,
    libraryImportPath:
      options.libraryImportPath ?? options.libraryProject ?? options.prismProject,
    prismProject: options.prismProject,
    configFile: options.configFile ?? 'ng-prism.config.ts',
    cacheDir,
  };

  await runPrismPipeline(pipelineOptions, context, createPipelineState());

  const run = await context.scheduleTarget(
    { project: options.prismProject, target: 'build', configuration: '' },
    options.outputPath ? { outputPath: { base: options.outputPath, browser: '' } } : {},
  );

  return run.result;
}

const builder: Builder<BuildBuilderSchema & json.JsonObject> = createBuilder<BuildBuilderSchema>(createBuildBuilder);
export default builder;
