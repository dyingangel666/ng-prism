#!/usr/bin/env node
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { aggregateAuditResults } from './aggregator.js';
import { auditPrismApp } from './auditor.js';
import { startStaticServer } from './static-server.js';
import {
  checkA11yThresholds,
  type ThresholdViolation,
} from '../../builder/a11y/a11y-report-reader.js';
import { resolveA11yThresholds } from '../../app/panels/a11y/a11y-thresholds.js';
import type { A11yThresholds } from '../../app/panels/a11y/a11y.types.js';

interface CliArgs {
  dist: string;
  output: string;
  port: number;
  thresholds: Partial<A11yThresholds>;
  include: string[];
  exclude: string[];
  failOnViolation: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    dist: '',
    output: 'a11y-report.json',
    port: 4317,
    thresholds: {},
    include: [],
    exclude: [],
    failOnViolation: true,
  };

  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    const next = (): string => {
      const v = argv[++i];
      if (v === undefined) {
        throw new Error(`Missing value for ${a}`);
      }
      return v;
    };

    switch (a) {
      case '--dist':
        args.dist = next();
        break;
      case '--output':
      case '-o':
        args.output = next();
        break;
      case '--port':
        args.port = parseInt(next(), 10);
        break;
      case '--include':
        args.include = next().split(',').map((s) => s.trim()).filter(Boolean);
        break;
      case '--exclude':
        args.exclude = next().split(',').map((s) => s.trim()).filter(Boolean);
        break;
      case '--score':
        args.thresholds.score = parseInt(next(), 10);
        break;
      case '--max-critical':
        args.thresholds.critical = parseInt(next(), 10);
        break;
      case '--max-serious':
        args.thresholds.serious = parseInt(next(), 10);
        break;
      case '--max-moderate':
        args.thresholds.moderate = parseInt(next(), 10);
        break;
      case '--no-fail':
        args.failOnViolation = false;
        break;
      case '-h':
      case '--help':
        printHelp();
        process.exit(0);
      default:
        throw new Error(`Unknown argument: ${a}`);
    }
  }

  if (!args.dist) {
    throw new Error('Missing required --dist <path-to-built-prism-app>');
  }

  return args;
}

function printHelp(): void {
  process.stdout.write(
    `ng-prism-audit-a11y — accessibility audit for a built Prism app.\n\n` +
      `Usage:\n` +
      `  ng-prism-audit-a11y --dist <path> [options]\n\n` +
      `Required:\n` +
      `  --dist <path>          Path to the built Prism app (contains index.html)\n\n` +
      `Output:\n` +
      `  --output <file>        Report output path (default: a11y-report.json)\n\n` +
      `Server:\n` +
      `  --port <n>             Static server port (default: 4317)\n\n` +
      `Filtering:\n` +
      `  --include A,B          Only audit these component class names\n` +
      `  --exclude A,B          Skip these component class names\n\n` +
      `Thresholds (CI failure):\n` +
      `  --score <n>            Minimum avg score (default 80)\n` +
      `  --max-critical <n>     Allowed critical violations (default 0)\n` +
      `  --max-serious <n>      Allowed serious violations (default 0)\n` +
      `  --max-moderate <n>     Allowed moderate violations (default unlimited)\n` +
      `  --no-fail              Write report but never exit non-zero\n\n`,
  );
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv);

  const server = await startStaticServer(args.dist, args.port);
  process.stdout.write(`Serving ${args.dist} at ${server.url}\n`);

  try {
    const rawResults = await auditPrismApp({
      baseUrl: server.url,
      include: args.include,
      exclude: args.exclude,
      log: (msg) => process.stdout.write(`  ${msg}\n`),
    });

    const report = aggregateAuditResults(rawResults);
    const resolvedThresholds = resolveA11yThresholds(args.thresholds);

    const outputPath = resolve(args.output);
    writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf-8');
    process.stdout.write(`\nReport written: ${outputPath}\n`);
    process.stdout.write(
      `Library score: ${report.total.score}% ` +
        `(${report.total.auditedVariants} variants across ${report.total.auditedComponents} components)\n` +
        `Violations: ${report.total.critical} critical · ${report.total.serious} serious · ` +
        `${report.total.moderate} moderate · ${report.total.minor} minor\n`,
    );

    const violations = checkA11yThresholds({
      total: report.total,
      thresholds: resolvedThresholds,
    });

    if (violations.length > 0) {
      process.stderr.write('\nThreshold violations:\n');
      for (const v of violations) {
        process.stderr.write(`  - ${formatViolation(v)}\n`);
      }
      if (args.failOnViolation) {
        process.exitCode = 1;
      }
    } else {
      process.stdout.write('\nAll thresholds met.\n');
    }
  } finally {
    await server.close();
  }
}

function formatViolation(v: ThresholdViolation): string {
  if (v.metric === 'score') {
    return `score ${v.actual}% < ${v.threshold}%`;
  }
  return `${v.metric}: ${v.actual} > ${v.threshold} allowed`;
}

main().catch((err: unknown) => {
  process.stderr.write(`Error: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
