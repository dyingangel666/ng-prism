import { createBuilder, type Builder, type BuilderContext, type BuilderOutput } from '@angular-devkit/architect';
import type { json } from '@angular-devkit/core';
import { join } from 'path';
import { existsSync, appendFileSync } from 'fs';
import type { ServeBuilderSchema } from './schema.js';
import { runPrismPipeline, type PrismPipelineOptions } from '../shared/prism-pipeline.js';
import { startWatcher } from '../watcher/index.js';

async function createServeBuilder(
  options: ServeBuilderSchema,
  context: BuilderContext,
): Promise<BuilderOutput> {
  const pipelineOptions: PrismPipelineOptions = {
    entryPoint: options.entryPoint,
    libraryImportPath: options.libraryImportPath ?? options.libraryProject ?? options.prismProject,
    prismProject: options.prismProject,
    configFile: options.configFile ?? 'ng-prism.config.ts',
  };

  const initialResult = await runPrismPipeline(pipelineOptions, context);

  const absoluteEntryPoint = join(context.workspaceRoot, options.entryPoint);
  const configFilePath = join(context.workspaceRoot, pipelineOptions.configFile);
  const absolutePrismProject = join(context.workspaceRoot, options.prismProject);
  const watcher = startWatcher({
    entryPoint: absoluteEntryPoint,
    configFile: existsSync(configFilePath) ? configFilePath : undefined,
    ignorePaths: [absolutePrismProject],
    onRebuild: async () => {
      await runPrismPipeline(pipelineOptions, context);
      appendFileSync(initialResult.manifestPath, `\n// ng-prism rebuild: ${Date.now()}\n`);
    },
    logger: {
      info: (msg: string) => console.log(msg),
      error: (msg: string) => console.error(msg),
    },
  });

  const run = await context.scheduleTarget(
    { project: options.prismProject, target: 'serve', configuration: '' },
    { port: options.port ?? 4400 },
  );

  const shutdown = () => {
    watcher.close();
    run.stop();
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);

  return new Promise<BuilderOutput>((resolve, reject) => {
    let lastOutput: BuilderOutput | undefined;
    run.output.subscribe({
      next: (output) => { lastOutput = output; },
      error: (err) => { shutdown(); reject(err); },
      complete: () => { watcher.close(); resolve(lastOutput ?? { success: false }); },
    });
  });
}

const builder: Builder<ServeBuilderSchema & json.JsonObject> = createBuilder<ServeBuilderSchema>(createServeBuilder);
export default builder;
