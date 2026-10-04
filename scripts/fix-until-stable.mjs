#!/usr/bin/env node
/**
 * Runs `--fix` until nothing changes, for ESLint and Stylelint.
 *
 * One pass is not reliable for either: `import/order` needs two on some
 * files, and `property-no-vendor-prefix` against `order/properties-order`
 * leaves a duplicate declaration for one pass (`-webkit-background-clip: text`
 * becomes `background-clip: text`, which is already next to it; the second
 * pass removes the duplicate). lint-staged runs one pass, so a file would be
 * committed as clean when it isn't, and CI reports it later.
 *
 * Uses the Node API of both tools, not their CLI via npx, for three reasons:
 * `execFileSync('npx', ...)` starts no shell and so does not find `npx.cmd`
 * on Windows; every pass would pay for npx resolution again; and the API
 * reports whether it wrote anything: for ESLint via `result.output`, which
 * also covers directory arguments like `.` that can't be read as a file.
 *
 * The pass limit is a stop against two rules rewriting each other in a loop.
 * Hitting it means a config bug; don't raise the value.
 */
import { readFileSync } from 'node:fs';
import { ESLint } from 'eslint';
import stylelint from 'stylelint';

const MAX_PASSES = 5;

const [tool, ...targets] = process.argv.slice(2);

if (tool !== 'eslint' && tool !== 'stylelint') {
    console.error(`Unknown tool: ${tool}. Expected: eslint, stylelint`);
    process.exit(1);
}

if (targets.length === 0) process.exit(0);

function giveUp() {
    console.error(`${tool} --fix did not stabilize after ${MAX_PASSES} passes.\n` + 'Two rules keep rewriting the same spot. Fix the config; do not raise this limit.');
    process.exit(1);
}

/**
 * lint-staged passes the currently staged paths. Some of them may be ignored
 * by ESLint (test-workspace was until recently, generated boilerplate still
 * is). `warnIgnored: false` suppresses the "File ignored" warning that would
 * otherwise show on every commit, and `errorOnUnmatchedPattern: false` keeps a
 * staged set made only of ignored files from blocking the commit with a bogus
 * error.
 */
async function fixWithEslint() {
    const engine = new ESLint({ fix: true, warnIgnored: false, errorOnUnmatchedPattern: false });

    for (let pass = 1; pass <= MAX_PASSES; pass++) {
        const results = await engine.lintFiles(targets);

        await ESLint.outputFixes(results);

        if (results.some((r) => typeof r.output === 'string')) continue;

        const text = (await engine.loadFormatter('stylish')).format(results);

        if (text.trim()) console.error(text);

        // Only errors block. Whether warnings fail a run is decided by
        // `--max-warnings 0` on the lint target, not by this fix pass.
        process.exit(results.some((r) => r.errorCount > 0) ? 1 : 0);
    }

    giveUp();
}

/**
 * Stylelint's API does not report whether it wrote anything, so we digest the
 * sources it actually processed and compare with the previous pass. That also
 * covers globs and directories, since the file list comes from the result,
 * not from the arguments.
 */
function digest(sources) {
    try {
        return sources.map((f) => readFileSync(f, 'utf-8')).join('\0');
    } catch (err) {
        console.error(`Could not read file: ${err.message}\n` + 'Check the path: does the file (still) exist and is it readable?');
        process.exit(1);
    }
}

async function fixWithStylelint() {
    let before = null;

    for (let pass = 1; pass <= MAX_PASSES; pass++) {
        let result;

        try {
            // Stylelint's Node API formats `report` as JSON by default, which
            // would print raw data on a finding instead of the CLI message.
            result = await stylelint.lint({ files: targets, fix: true, allowEmptyInput: true, formatter: 'string' });
        } catch (err) {
            // Usually Stylelint itself choked on a file (e.g. a syntax error)
            // that no autofix can repair, not a bug in this script.
            console.error(
                `stylelint --fix aborted: ${err.message}\n` +
                    'Probably a finding no autofix can repair. Fix it by hand and retry; ' +
                    'the commit stays blocked until then.'
            );
            process.exit(1);
        }

        const after = digest(result.results.map((r) => r.source).filter(Boolean));

        if (after === before) {
            if (result.report?.trim()) console.error(result.report);

            process.exit(result.errored ? 1 : 0);
        }

        before = after;
    }

    giveUp();
}

await (tool === 'eslint' ? fixWithEslint() : fixWithStylelint());
