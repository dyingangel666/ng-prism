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

// Liest eine Datei nicht sauber (gelöscht, kein Zugriff, …), ist das kein Fall
// für den rohen Stacktrace: Meldung mit Pfad, Commit bleibt blockiert (exit 1).
const digest = () => {
    try {
        return files.map((f) => readFileSync(f, 'utf-8')).join('\0');
    } catch (err) {
        console.error(`Konnte Datei nicht lesen: ${err.message}\n` + 'Pfad prüfen — existiert die Datei (noch) und ist sie lesbar?');
        process.exit(1);
    }
};

let before = digest();
for (let pass = 1; pass <= MAX_PASSES; pass++) {
    // Ein Fehler hier heißt meist: das Werkzeug selbst hat etwas gefunden, das
    // kein Autofix beheben kann (z.B. ein Parse-Fehler) — kein Bug in diesem
    // Script. Exit-Code des Werkzeugs übernehmen und durchreichen, statt mit
    // Stacktrace abzubrechen: der Commit bleibt blockiert, aber die Meldung
    // sagt, woran es liegt.
    try {
        execFileSync('npx', [...TOOLS[tool], ...files], { stdio: 'inherit' });
    } catch (err) {
        const code = typeof err.status === 'number' && err.status !== 0 ? err.status : 1;
        console.error(
            `${tool} --fix ist mit Exit-Code ${code} abgebrochen.\n` +
                'Vermutlich ein Fund, den kein Autofix beheben kann (z.B. ein Parse-Fehler) — ' +
                'die Ausgabe oben zeigt, welcher. Von Hand reparieren und erneut versuchen; der ' +
                'Commit bleibt so lange blockiert.'
        );
        process.exit(code);
    }
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
