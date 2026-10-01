#!/usr/bin/env node
/**
 * `--fix` bis zum Fixpunkt, für ESLint wie für Stylelint.
 *
 * Ein einzelner Durchlauf reicht bei keinem der beiden zuverlässig:
 * `import/order` braucht bei manchen Dateien zwei, und
 * `property-no-vendor-prefix` gegen `order/properties-order` hinterlässt einen
 * Durchlauf lang eine doppelte Deklaration (`-webkit-background-clip: text`
 * wird zu `background-clip: text`, das daneben schon steht; erst der zweite
 * Durchlauf räumt das Duplikat weg). lint-staged fährt genau einen Durchlauf,
 * also würde eine Datei als sauber committet, die es nicht ist — und die CI
 * meldet es später.
 *
 * Aufgerufen wird hier die Node-API beider Werkzeuge, nicht deren CLI über
 * npx. Drei Gründe: `execFileSync('npx', …)` startet keine Shell und findet
 * unter Windows deshalb `npx.cmd` nicht; jeder Durchlauf zahlte sonst erneut
 * npx' Auflösung; und die API sagt von sich aus, ob sie etwas geschrieben hat
 * — bei ESLint über `result.output`, was auch Verzeichnisargumente wie `.`
 * abdeckt, die sich nicht als Datei einlesen lassen.
 *
 * Die Obergrenze ist eine Reißleine gegen zwei Regeln, die einander im Kreis
 * umschreiben. Wird sie erreicht, ist das ein Konfigurationsfehler und kein
 * Grund, den Wert zu erhöhen.
 */
import { readFileSync } from 'node:fs';
import { ESLint } from 'eslint';
import stylelint from 'stylelint';

const MAX_PASSES = 5;

const [tool, ...targets] = process.argv.slice(2);

if (tool !== 'eslint' && tool !== 'stylelint') {
    console.error(`Unbekanntes Werkzeug: ${tool}. Erwartet: eslint, stylelint`);
    process.exit(1);
}

if (targets.length === 0) process.exit(0);

function giveUp() {
    console.error(
        `${tool} --fix hat nach ${MAX_PASSES} Durchläufen keinen stabilen Zustand erreicht.\n` +
            'Zwei Regeln schreiben dieselbe Stelle gegeneinander um. Die Konfiguration ' +
            'ist zu reparieren, nicht dieser Wert zu erhöhen.'
    );
    process.exit(1);
}

/**
 * lint-staged übergibt die Pfade, die gerade gestaged sind — darunter können
 * Dateien sein, die ESLint ignoriert (test-workspace war das bis vor Kurzem,
 * generiertes Boilerplate ist es weiterhin). `warnIgnored: false` hält die
 * sonst bei jedem Commit anfallende "File ignored"-Warnung heraus, und
 * `errorOnUnmatchedPattern: false` verhindert, dass ein Stage-Set aus lauter
 * ignorierten Dateien den Commit mit einem Fehler blockiert, der keiner ist.
 */
async function fixWithEslint() {
    const engine = new ESLint({ fix: true, warnIgnored: false, errorOnUnmatchedPattern: false });

    for (let pass = 1; pass <= MAX_PASSES; pass++) {
        const results = await engine.lintFiles(targets);

        await ESLint.outputFixes(results);

        if (results.some((r) => typeof r.output === 'string')) continue;

        const text = (await engine.loadFormatter('stylish')).format(results);

        if (text.trim()) console.error(text);

        // Nur Errors blockieren. Warnungen sind in dieser Config bewusst
        // Warnungen; ob sie einen Lauf scheitern lassen, entscheidet
        // `--max-warnings 0` am lint-Target, nicht dieser Fix-Durchlauf.
        process.exit(results.some((r) => r.errorCount > 0) ? 1 : 0);
    }

    giveUp();
}

/**
 * Stylelints API meldet nicht, ob sie geschrieben hat, also wird über die
 * tatsächlich verarbeiteten Quellen ein Digest gebildet und mit dem des
 * Vordurchlaufs verglichen. Das deckt auch Globs und Verzeichnisse ab, weil
 * die Dateiliste aus dem Ergebnis stammt und nicht aus den Argumenten.
 */
function digest(sources) {
    try {
        return sources.map((f) => readFileSync(f, 'utf-8')).join('\0');
    } catch (err) {
        console.error(`Konnte Datei nicht lesen: ${err.message}\n` + 'Pfad prüfen — existiert die Datei (noch) und ist sie lesbar?');
        process.exit(1);
    }
}

async function fixWithStylelint() {
    let before = null;

    for (let pass = 1; pass <= MAX_PASSES; pass++) {
        let result;

        try {
            // `formatter: 'string'` ist Absicht: die Node-API von Stylelint
            // formatiert `report` sonst als JSON, und bei einem Fund staende
            // hier eine Wand aus Rohdaten statt der Meldung, die die CLI
            // ausgeben wuerde.
            result = await stylelint.lint({ files: targets, fix: true, allowEmptyInput: true, formatter: 'string' });
        } catch (err) {
            // Ein Fehler hier heißt meist: Stylelint selbst kam mit einer
            // Datei nicht zurecht (z.B. ein Syntaxfehler), den kein Autofix
            // behebt — kein Bug in diesem Script.
            console.error(
                `stylelint --fix ist abgebrochen: ${err.message}\n` +
                    'Vermutlich ein Fund, den kein Autofix beheben kann — von Hand reparieren ' +
                    'und erneut versuchen; der Commit bleibt so lange blockiert.'
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
