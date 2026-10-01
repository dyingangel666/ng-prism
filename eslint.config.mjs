import { join } from 'node:path';
import js from '@eslint/js';
import globals from 'globals';
import angular from 'angular-eslint';
import tseslint from 'typescript-eslint';
import stylistic from '@stylistic/eslint-plugin';
import unusedImports from 'eslint-plugin-unused-imports';
import importPlugin from 'eslint-plugin-import';
import prettierRecommended from 'eslint-plugin-prettier/recommended';

export default [
    {
        // Jeder Eintrag ist bewusst entweder root-verankert (nur
        // <workspaceRoot>/<name>) oder mit `**/` auf beliebige Tiefe
        // ausgelegt — je nachdem, wo das jeweils generierte Verzeichnis
        // tatsächlich entsteht. Ein bloßer Name ohne `**/` matcht in
        // ESLints Flat-Config-Ignores NUR die Wurzel, anders als in
        // .gitignore: `nx build` schreibt z.B. nach packages/*/dist,
        // Jest nach packages/*/test-output/jest/coverage — beides bräche
        // ohne `**/` durch.
        ignores: [
            // Generierte Build-/Test-Artefakte: pro Package, daher `**/`.
            '**/dist',
            '**/out-tsc',
            '**/node_modules',
            '**/coverage',
            // Angulars Build-Cache — entsteht pro Angular-Workspace, hier
            // also unter test-workspace/.angular.
            '**/.angular',
            // `join(workspaceRoot, 'ng-prism-cache')` (siehe
            // builder/shared/prism-pipeline.ts) — nie pro Package, aber pro
            // *Workspace*, und seit test-workspace mitgelintet wird gibt es
            // davon zwei: das generierte prism-manifest.ts liegt unter
            // test-workspace/ng-prism-cache/, nicht nur am Repo-Root.
            '**/ng-prism-cache',

            // Einzelne, feste Verzeichnisse am Workspace-Root — es gibt
            // keinen Mechanismus, der sie pro Package anlegt, daher
            // bewusst root-verankert ohne `**/`.
            '.nx',
            '.claude',
            '.superpowers',
            '.posts',
            // Verdaccios local-registry-Storage, immer tmp/local-registry/
            // storage am Repo-Root — dieselbe Begründung wie der `/tmp`-
            // Eintrag in .prettierignore, und anders als dist/out-tsc/
            // coverage oben eben *nicht* pro Package.
            'tmp',

            // Generiertes/unveränderliches CommonJS-Tooling: ESLint lief
            // hier ohnehin nie über `**/*.ts`/`**/*.html` hinaus, traf also
            // nie eine Regel — bislang ein Zufallszustand statt einer
            // Entscheidung (ein `/* eslint-disable */` in jest.config.cjs
            // wurde beim Autofix in Task 3 kommentarlos entfernt, weil es
            // wirkungslos war). jest.preset.js und die sieben
            // jest.config.cjs sind von Nx erzeugtes Boilerplate mit fester
            // Form; eine eigene Node-Regelmenge dafür brächte nichts, was
            // ein erneuter Nx-Generatorlauf nicht wieder verwerfen würde.
            // eslint.config.mjs ist die Lint-Konfiguration selbst.
            // scripts/check-declared-deps.mjs ist davon bewusst
            // ausgenommen (siehe eigener `files`-Block unten): es ist
            // echte, handgeschriebene Logik, kein generiertes Boilerplate,
            // und läuft in `npm run check` und CI.
            'jest.preset.js',
            '**/jest.config.cjs',
            'eslint.config.mjs',

            '**/plugin-registry.ts',
            '**/.DS_Store'
        ]
    },

    // ──── TypeScript ────
    { ...js.configs.recommended, files: ['**/*.ts'] },
    { ...importPlugin.flatConfigs.recommended, files: ['**/*.ts'] },
    { ...prettierRecommended, files: ['**/*.ts'] },
    ...tseslint.configs.recommended.map((config) => ({ ...config, files: ['**/*.ts'] })),
    ...angular.configs.tsRecommended.map((config) => ({
        ...config,
        files: ['**/*.ts'],
        processor: angular.processInlineTemplates
    })),
    {
        files: ['**/*.ts'],
        plugins: {
            '@stylistic': stylistic,
            'unused-imports': unusedImports
        },
        settings: {
            'import/resolver': {
                typescript: {
                    // Absolut, an dieser Datei verankert — nicht relativ. Jedes
                    // von @nx/eslint/plugin inferierte Target läuft mit
                    // `cwd: <projectRoot>`, und relative Pfade lösen dort ins
                    // Leere (`packages/ng-prism/packages/*/tsconfig.lib.json`).
                    // Der Resolver findet dann nichts, import/order steckt die
                    // betroffenen Specifier in eine andere Gruppe, und dieselbe
                    // Datei fällt je nach Aufrufort unterschiedlich aus —
                    // nachgewiesen an test-ui-kit-prism/src/main.ts, das aus
                    // dem Repo-Root sauber war und aus test-workspace heraus
                    // eine import/order-Meldung ergab.
                    project: [join(import.meta.dirname, 'tsconfig.base.json'), join(import.meta.dirname, 'packages/*/tsconfig.lib.json')],
                    noWarnOnMultipleProjects: true
                },
                node: true
            }
        },
        rules: {
            // Beide stehen in js.configs.recommended auf `error` und bleiben
            // dort: das sind keine Stilregeln. no-unsafe-optional-chaining
            // fängt `(a?.b).c` — einen garantierten TypeError, sobald das
            // Optional kurzschließt; no-case-declarations fängt ein `const`
            // in einem `case`, das über den ganzen switch-Block leckt.
            // Herabstufen auf `warn` hieße bei `--max-warnings 0` nur, die
            // Meldung gelb statt rot zu färben — der Lauf schlägt so oder so
            // fehl, also lieber mit der Severity, die zur Sache passt.

            // unused-imports/no-unused-vars deckt denselben Fall ab, autofixt
            // zusätzlich ungenutzte Imports und respektiert bereits die
            // `_`-Präfix-Konvention (siehe unten). Mit beiden Regeln aktiv
            // meldet jeder ungenutzte Wert doppelt, und zwar mit
            // unterschiedlichen Ignore-Patterns — @typescript-eslint/no-unused-vars
            // kennt das `_`-Präfix nicht, daher feuert es selbst auf bereits
            // korrekt benannten Parametern.
            '@typescript-eslint/no-unused-vars': 'off',
            '@typescript-eslint/no-unused-expressions': 'off',
            '@typescript-eslint/no-non-null-assertion': 'off',
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-empty-function': ['warn', { allow: ['arrowFunctions'] }],
            '@angular-eslint/no-output-on-prefix': 'off',
            '@angular-eslint/prefer-standalone': 'off',
            '@angular-eslint/prefer-on-push-component-change-detection': ['warn'],

            // Die Auflösung zwischen Packages läuft über npm-Workspaces und
            // customConditions: ["@org/source"], was der Resolver nicht nachvollzieht.
            // TypeScript prüft das im typecheck-Target ohnehin.
            'import/no-unresolved': 'off',

            // ──── Stylistic ────
            //
            // Nur Regeln, die eslint-config-prettier NICHT abschaltet — also
            // genau die, über die Prettier keine Aussage trifft. Alles, was
            // eslint-config-prettier (via eslint-plugin-prettier/recommended,
            // oben gespreadet) ausschaltet, bleibt ausgeschaltet: diese
            // Config-Liste steht hinter jenem Spread, jede hier gesetzte
            // Regel würde die Abschaltung also wieder aufheben.
            //
            // Das ist kein Geschmacksurteil, sondern gemessen: mit den 17
            // zuvor hier stehenden Regeln (array-bracket-spacing, arrow-parens,
            // semi, eol-last, object-curly-spacing, padded-blocks, …) ändert
            // ein `eslint --fix` über den gesamten Baum exakt dieselben null
            // Dateien wie ohne sie. Sie setzen durch, was prettier/prettier
            // ohnehin durchsetzt — und zwar als zweiter Fixer auf derselben
            // Stelle. Genau diese Klasse hat schon einmal zugeschlagen:
            // array-element-newline und object-property-newline mussten
            // entfernt werden, nachdem `eslint --fix` "Circular fixes
            // detected … conflicting rules in your configuration" geloggt,
            // die Datei zerschrieben und Fehler hinterlassen hatte. Kein
            // Zugewinn gegen ein reales Risiko — deshalb nur noch diese vier.
            '@stylistic/curly-newline': ['warn', { consistent: true }],
            '@stylistic/spaced-comment': ['warn', 'always', { exceptions: ['*'] }],
            '@stylistic/multiline-comment-style': 'off',
            '@stylistic/padding-line-between-statements': [
                'warn',
                { blankLine: 'always', prev: ['const', 'let', 'var'], next: '*' },
                { blankLine: 'any', prev: ['const', 'let', 'var'], next: ['const', 'let', 'var'] }
            ],

            // ──── Imports ────
            'unused-imports/no-unused-imports': 'warn',
            'unused-imports/no-unused-vars': [
                'warn',
                {
                    vars: 'all',
                    varsIgnorePattern: '^_',
                    args: 'after-used',
                    argsIgnorePattern: '^_'
                }
            ],
            'import/no-absolute-path': 'warn',
            'import/no-useless-path-segments': 'warn',
            'import/first': 'warn',
            'import/newline-after-import': 'warn',
            'import/no-duplicates': 'warn',
            'import/order': [
                'warn',
                {
                    named: true,
                    alphabetize: { order: 'asc', caseInsensitive: true },
                    'newlines-between': 'never'
                }
            ]
        }
    },

    // ──── Fixtures und Mocks ────
    //
    // Die Fixtures unter __fixtures__ sind Eingabedaten für den Scanner, keine
    // Produktivkomponenten: sie tragen absichtlich fremde Selektoren wie
    // my-button oder lib-button, weil genau das getestet wird. Ein
    // ungenutzter Parameter oder eine ungenutzte lokale Variable gehört zum
    // Zweck dieser Dateien (sie deklarieren eine Form, die niemand liest),
    // daher bleibt no-unused-vars hier komplett aus — anders als in Specs
    // (siehe unten), wo derselbe Befund ein echter Defekt wäre.
    {
        files: ['**/__fixtures__/**/*.ts', '**/__mocks__/**/*.ts'],
        rules: {
            '@angular-eslint/prefer-on-push-component-change-detection': 'off',
            '@typescript-eslint/no-empty-function': 'off',
            'unused-imports/no-unused-vars': 'off'
        }
    },

    // ──── Specs ────
    //
    // Specs sind gewöhnlicher Code, der zufällig etwas testet: eine
    // ungenutzte lokale Variable oder ein ungenutzter Parameter ohne
    // `_`-Präfix ist hier genauso ein Defekt wie überall sonst, daher KEIN
    // pauschales `unused-imports/no-unused-vars: 'off'` wie bei den
    // Fixtures/Mocks oben — die allgemeine Regel samt `_`-Konvention greift
    // unverändert.
    {
        files: ['**/*.spec.ts'],
        rules: {
            '@angular-eslint/prefer-on-push-component-change-detection': 'off',
            '@typescript-eslint/no-empty-function': 'off',

            // A couple of specs spy on a built-in module (e.g.
            // `jest.spyOn(require('node:fs'), 'readFileSync')`) to observe
            // calls the source file under test makes. That needs the exact
            // module object Node's require cache hands out; the source
            // files import the same built-in via static ESM `import`, which
            // after SWC's transform is a distinct object, so spying on it
            // does not see those calls (verified: swapping the require()
            // for a static import makes the spy-based assertion fail). No
            // static import reaches the live, requireable object here, so
            // require() stays.
            '@typescript-eslint/no-require-imports': 'off'
        }
    },

    // ──── Node-Skripte ────
    //
    // scripts/ ist reines, handgeschriebenes ESM ohne jede Berührung mit
    // Angular oder dem Browser — anders als builder/, wo Node- und
    // Browser-Code im selben Verzeichnis nebeneinander liegen und eine
    // Verzeichnis-Override deshalb in beide Richtungen falsch läge (daher
    // bleibt eine Node-Kontext-Override dort bewusst außerhalb dieses
    // Plans). scripts/ hat dieses Problem nicht, bekommt also eine echte,
    // kleine Regelmenge statt eines Ignores. test-workspace/*.mjs sind die
    // beiden Messskripte (measure-pipeline, measure-watch-rebuilds) und
    // derselbe Fall.
    //
    // globals.nodeBuiltin statt einer handgepflegten Liste: die Skripte
    // brauchen heute nur process und console, aber eine Liste, die genau das
    // enthält, quittiert das erste Buffer, URL oder fetch mit einem
    // no-undef, das wie ein echter Fund aussieht und keiner ist.
    {
        ...js.configs.recommended,
        files: ['scripts/**/*.mjs', 'test-workspace/*.mjs'],
        languageOptions: {
            sourceType: 'module',
            ecmaVersion: 'latest',
            globals: globals.nodeBuiltin
        }
    },

    // ──── Angular-Templates ────
    //
    // Erfasst zweierlei: die ausgelagerten Templates unter packages/, und die
    // virtuellen .html-Dateien, die `angular.processInlineTemplates` (oben am
    // **/*.ts-Block) aus jedem inline `template:` erzeugt. Letztere liegen
    // unter einem Pfadsegment, das auf .ts endet, matchen also dieselben
    // `**/*.html`-Globs — nur deshalb werden Inline-Templates überhaupt
    // formatiert.
    //
    // Die drei echten .html im Baum sind dagegen *keine* Angular-Templates:
    // docs/index.html ist die docsify-Seite, die beiden index.html sind die
    // App-Shells von test-lib-prism und test-ui-kit-prism. ESLint hat für
    // vollständige HTML-Dokumente ohnehin keinen Parser (der Angular-
    // Template-Parser scheitert an `<!doctype html>`), und mit `parser:
    // 'angular'` formatiert würden sie anders aussehen als das, was die
    // Prettier-CLI für dieselbe Datei produziert — `nx format:check` und
    // dieser Lauf lägen dauerhaft über Kreuz. Sie laufen deshalb über den
    // Prettier-Eintrag in lint-staged, nicht über ESLint.
    ...angular.configs.templateRecommended.map((config) => ({
        ...config,
        files: ['packages/**/*.html', 'test-workspace/**/*.html'],
        ignores: ['**/index.html']
    })),
    { ...prettierRecommended, files: ['packages/**/*.html', 'test-workspace/**/*.html'], ignores: ['**/index.html'] },
    {
        files: ['packages/**/*.html', 'test-workspace/**/*.html'],
        ignores: ['**/index.html'],
        rules: {
            'prettier/prettier': ['error', { parser: 'angular' }]
        }
    }
];
