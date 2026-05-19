// Cold-scan memory + time bench for the shared-ts-program refactor (#8 / #9).
// Run with: node measure-pipeline.mjs   (from test-workspace/)
//
// Invokes the pipeline directly against the expanded test-ui-kit fixture
// (15 secondaries × Material/CDK imports) and reports heap delta + duration.
// Requires `npx nx build ng-prism` first so the dist/ output exists.

import {
  runPrismPipeline,
  createPipelineState,
} from '../packages/ng-prism/dist/builder/shared/prism-pipeline.js';

const workspaceRoot = process.cwd();
const ctx = {
  workspaceRoot,
  reportStatus: () => {},
  logger: { info: (m) => console.log(m), error: (m) => console.error(m) },
  getProjectMetadata: async () => ({
    sourceRoot: 'projects/test-ui-kit-prism/src',
  }),
};

const before = process.memoryUsage();
console.log(
  `heap before: ${(before.heapUsed / 1024 / 1024).toFixed(
    1
  )} MB | rss before: ${(before.rss / 1024 / 1024).toFixed(1)} MB`
);

const t0 = Date.now();
const result = await runPrismPipeline(
  {
    entryPoint: 'projects/test-ui-kit',
    libraryImportPath: 'test-ui-kit',
    prismProject: 'test-ui-kit-prism',
    configFile: 'ng-prism.config.ts',
  },
  ctx,
  createPipelineState()
);
const dt = Date.now() - t0;

const after = process.memoryUsage();
console.log(
  `heap after:  ${(after.heapUsed / 1024 / 1024).toFixed(
    1
  )} MB | rss after:  ${(after.rss / 1024 / 1024).toFixed(1)} MB`
);
console.log(
  `delta heap:  ${((after.heapUsed - before.heapUsed) / 1024 / 1024).toFixed(
    1
  )} MB`
);
console.log(`time: ${dt} ms`);
console.log(`components: ${result.componentCount}, pages: ${result.pageCount}`);
