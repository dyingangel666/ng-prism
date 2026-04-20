import { createBuilder, type Builder, type BuilderContext, type BuilderOutput } from '@angular-devkit/architect';
import type { json } from '@angular-devkit/core';
import type { BuildBuilderSchema } from './schema.js';
import { runPrismPipeline, createPipelineState, type PrismPipelineOptions } from '../shared/prism-pipeline.js';

async function createBuildBuilder(
  options: BuildBuilderSchema,
  context: BuilderContext,
): Promise<BuilderOutput> {
  const pipelineOptions: PrismPipelineOptions = {
    entryPoint: options.entryPoint,
    libraryImportPath: options.libraryImportPath ?? options.libraryProject ?? options.prismProject,
    prismProject: options.prismProject,
    configFile: options.configFile ?? 'ng-prism.config.ts',
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
