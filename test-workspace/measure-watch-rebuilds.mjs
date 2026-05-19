// Watch-mode steady-state bench for the shared-ts-program refactor.
// Run with: node --expose-gc measure-watch-rebuilds.mjs
//
// Loops N rebuilds against test-ui-kit, mutating one component file between each call.
// Reports per-rebuild RSS + duration, then validates that after warm-up the RSS does
// not drift more than 10% — the steady-state criterion from the design doc.

import {
  runPrismPipeline,
  createPipelineState,
} from '../packages/ng-prism/dist/builder/shared/prism-pipeline.js';
import { readFileSync, writeFileSync } from 'fs';

const ITERATIONS = 100;
const WARMUP = 5;
const STEADY_STATE_TOLERANCE = 0.10; // 10%

const workspaceRoot = process.cwd();
const ctx = {
  workspaceRoot,
  reportStatus: () => {},
  logger: { info: () => {}, error: (m) => console.error(m) },
  getProjectMetadata: async () => ({
    sourceRoot: 'projects/test-ui-kit-prism/src',
  }),
};
const options = {
  entryPoint: 'projects/test-ui-kit',
  libraryImportPath: 'test-ui-kit',
  prismProject: 'test-ui-kit-prism',
  configFile: 'ng-prism.config.ts',
};
const state = createPipelineState();

const targetFile = 'projects/test-ui-kit/button/button.component.ts';
const original = readFileSync(targetFile, 'utf-8');

const samples = [];

try {
  for (let i = 0; i < ITERATIONS; i++) {
    // Mutate the file (append a unique trailing comment) so TS invalidates its SourceFile.
    writeFileSync(targetFile, `${original}\n// rebuild marker ${i}\n`);

    const t0 = Date.now();
    await runPrismPipeline(options, ctx, state);
    const dt = Date.now() - t0;

    if (global.gc) global.gc();
    const rss = process.memoryUsage().rss;
    const heap = process.memoryUsage().heapUsed;
    samples.push({ i, rss, heap, dt });

    const rssMb = (rss / 1024 / 1024).toFixed(1);
    const heapMb = (heap / 1024 / 1024).toFixed(1);
    console.log(
      `rebuild ${String(i).padStart(3)}: RSS=${rssMb} MB | heap=${heapMb} MB | scan=${dt} ms`
    );
  }
} finally {
  writeFileSync(targetFile, original);
}

const warm = samples.slice(WARMUP);
const rssMin = Math.min(...warm.map((s) => s.rss));
const rssMax = Math.max(...warm.map((s) => s.rss));
const rssVar = (rssMax - rssMin) / rssMin;

const heapMin = Math.min(...warm.map((s) => s.heap));
const heapMax = Math.max(...warm.map((s) => s.heap));
const heapVar = (heapMax - heapMin) / heapMin;

const dtMean =
  warm.reduce((sum, s) => sum + s.dt, 0) / warm.length;
const dtP95 = warm
  .map((s) => s.dt)
  .sort((a, b) => a - b)[Math.floor(warm.length * 0.95)];

console.log(`\n=== Steady-state summary (rebuilds ${WARMUP}–${ITERATIONS - 1}) ===`);
console.log(
  `RSS:  min ${(rssMin / 1024 / 1024).toFixed(1)} MB,  max ${(
    rssMax / 1024 / 1024
  ).toFixed(1)} MB,  variation ${(rssVar * 100).toFixed(1)}%`
);
console.log(
  `Heap: min ${(heapMin / 1024 / 1024).toFixed(1)} MB,  max ${(
    heapMax / 1024 / 1024
  ).toFixed(1)} MB,  variation ${(heapVar * 100).toFixed(1)}%`
);
console.log(`Scan: mean ${dtMean.toFixed(0)} ms,  p95 ${dtP95} ms`);
console.log(`Cold scan (rebuild 0): ${samples[0].dt} ms`);

const pass = rssVar <= STEADY_STATE_TOLERANCE;
console.log(
  `\nSteady-state criterion (RSS variation ≤ ${(STEADY_STATE_TOLERANCE * 100).toFixed(0)}%): ${
    pass ? 'PASS ✓' : 'FAIL ✗'
  }`
);
process.exit(pass ? 0 : 1);
