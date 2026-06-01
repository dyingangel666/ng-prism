import { createRequire } from 'node:module';
import type { A11yScoreResult } from '../../app/panels/a11y/a11y.types.js';
import type { RawAuditResult } from './aggregator.js';

const require = createRequire(import.meta.url);

interface PrismGlobalManifest {
  components: Array<{
    className: string;
    variants: Array<{ name: string; index: number }>;
  }>;
}

export interface AuditOptions {
  baseUrl: string;
  /** Component class names to limit the audit to. Empty = all. */
  include?: string[];
  /** Component class names to skip. */
  exclude?: string[];
  /** Per-page navigation/render timeout in ms. Default 10_000. */
  timeoutMs?: number;
  /** Logger for progress output. */
  log?: (msg: string) => void;
}

export async function auditPrismApp(opts: AuditOptions): Promise<RawAuditResult[]> {
  const log = opts.log ?? (() => undefined);
  const timeoutMs = opts.timeoutMs ?? 10_000;

  const playwright = await loadPlaywright();
  const axeSource = loadAxeSource();

  const browser = await playwright.chromium.launch({ headless: true });
  try {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(opts.baseUrl, { waitUntil: 'networkidle', timeout: timeoutMs });
    await page.waitForFunction(
      () => (globalThis as Record<string, unknown>)['__PRISM_MANIFEST__'] !== undefined,
      undefined,
      { timeout: timeoutMs },
    );

    const manifest = (await page.evaluate(
      () => (globalThis as Record<string, unknown>)['__PRISM_MANIFEST__'],
    )) as PrismGlobalManifest;

    const targets = manifest.components.filter((c) => {
      if (opts.include?.length && !opts.include.includes(c.className)) return false;
      if (opts.exclude?.length && opts.exclude.includes(c.className)) return false;
      return true;
    });

    const results: RawAuditResult[] = [];

    for (const comp of targets) {
      for (const variant of comp.variants) {
        const url = new URL(opts.baseUrl);
        url.searchParams.set('component', comp.className);
        if (variant.index > 0) {
          url.searchParams.set('variant', String(variant.index));
        }
        log(`Auditing ${comp.className} :: ${variant.name} (#${variant.index})`);

        await page.goto(url.toString(), { waitUntil: 'load', timeout: timeoutMs });
        await page.waitForFunction(
          ([expected]) => {
            const el = document.querySelector('.demo-wrap');
            const key = el?.getAttribute('data-prism-rendered');
            return typeof key === 'string' && key.startsWith(expected);
          },
          [`${comp.className}:`],
          { timeout: timeoutMs },
        );

        await page.addScriptTag({ content: axeSource });

        const score = (await page.evaluate(async () => {
          const target = document.querySelector('.demo-wrap');
          const axe = (globalThis as Record<string, unknown>)['axe'] as {
            run: (el: Element) => Promise<{
              violations: Array<{ impact: 'critical' | 'serious' | 'moderate' | 'minor' | null }>;
              passes: unknown[];
              incomplete: unknown[];
            }>;
          };
          if (!target) {
            return {
              score: 0,
              violations: 0,
              critical: 0,
              serious: 0,
              moderate: 0,
              minor: 0,
              passes: 0,
              incomplete: 0,
            };
          }
          const r = await axe.run(target);
          const critical = r.violations.filter((v) => v.impact === 'critical').length;
          const serious = r.violations.filter((v) => v.impact === 'serious').length;
          const moderate = r.violations.filter((v) => v.impact === 'moderate').length;
          const minor = r.violations.filter((v) => v.impact === 'minor').length;
          const deductions = critical * 25 + serious * 10 + moderate * 5 + minor * 1;
          return {
            score: Math.max(0, 100 - deductions),
            violations: r.violations.length,
            critical,
            serious,
            moderate,
            minor,
            passes: r.passes.length,
            incomplete: r.incomplete.length,
          };
        })) as A11yScoreResult;

        results.push({
          className: comp.className,
          variantName: variant.name,
          variantIndex: variant.index,
          score,
        });
      }
    }

    return results;
  } finally {
    await browser.close();
  }
}

async function loadPlaywright(): Promise<typeof import('playwright')> {
  try {
    return (await import('playwright')) as unknown as typeof import('playwright');
  } catch (err) {
    throw new Error(
      'ng-prism-audit-a11y: `playwright` is not installed. Run `npm install --save-dev playwright` ' +
        'and `npx playwright install chromium`. Original error: ' +
        (err instanceof Error ? err.message : String(err)),
    );
  }
}

function loadAxeSource(): string {
  try {
    const path = require.resolve('axe-core/axe.min.js');
    return require('node:fs').readFileSync(path, 'utf-8');
  } catch (err) {
    throw new Error(
      'ng-prism-audit-a11y: `axe-core` is not installed. Run `npm install --save-dev axe-core`. ' +
        'Original error: ' +
        (err instanceof Error ? err.message : String(err)),
    );
  }
}
