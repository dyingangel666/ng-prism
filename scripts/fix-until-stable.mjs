#!/usr/bin/env node
/**
 * `--fix` bis zum Fixpunkt, für ESLint wie für Stylelint.
 *
 * Ein einzelner Durchlauf reicht bei keinem der beiden zuverlässig:
 * `import/order` braucht bei manchen Dateien zwei, und
 * `property-no-vendor-prefix` gegen `order/properties-order` hinterlässt einen
 * Durchlauf lang eine doppelte Deklaration. Beides gemessen beim Einführen
 * dieser Toolchain. lint-staged fährt genau einen Durchlauf, also würde eine
 * Datei als sauber committet, die es nicht ist — und die CI meldet es später.
 *
 * Die Obergrenze ist eine Reißleine gegen zwei Regeln, die einander im Kreis
 * umschreiben. Wird sie erreicht, ist das ein Konfigurationsfehler und kein
 * Grund, den Wert zu erhöhen.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const MAX_PASSES = 5;
const TOOLS = {
    eslint: ['eslint', '--fix'],
    stylelint: ['stylelint', '--allow-empty-input', '--fix']
};

const [tool, ...files] = process.argv.slice(2);
if (!TOOLS[tool]) {
    console.error(`Unbekanntes Werkzeug: ${tool}. Erwartet: ${Object.keys(TOOLS).join(', ')}`);
    process.exit(1);
}
if (files.length === 0) process.exit(0);

const digest = () => files.map((f) => readFileSync(f, 'utf-8')).join('\0');

let before = digest();
for (let pass = 1; pass <= MAX_PASSES; pass++) {
    execFileSync('npx', [...TOOLS[tool], ...files], { stdio: 'inherit' });
    const after = digest();
    if (after === before) process.exit(0);
    before = after;
}

console.error(
    `${tool} --fix hat nach ${MAX_PASSES} Durchläufen keinen stabilen Zustand erreicht.\n` +
        'Zwei Regeln schreiben dieselbe Stelle gegeneinander um. Die Konfiguration ' +
        'ist zu reparieren, nicht dieser Wert zu erhöhen.'
);
process.exit(1);
