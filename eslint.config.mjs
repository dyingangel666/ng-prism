import js from '@eslint/js';
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
            '**/tmp',
            '**/out-tsc',
            '**/node_modules',
            '**/coverage',

            // Einzelne, feste Verzeichnisse am Workspace-Root — es gibt
            // keinen Mechanismus, der sie pro Package anlegt, daher
            // bewusst root-verankert ohne `**/`.
            '.nx',
            '.claude',
            '.superpowers',
            '.posts',
            // Immer `join(workspaceRoot, 'ng-prism-cache')` (siehe
            // builder/shared/prism-pipeline.ts) — nie pro Package.
            'ng-prism-cache',
            'test-workspace',
            'docs',

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
                    project: ['tsconfig.base.json', 'packages/*/tsconfig.lib.json'],
                    noWarnOnMultipleProjects: true
                },
                node: true
            }
        },
        rules: {
            'no-case-declarations': 'warn',
            'no-unsafe-optional-chaining': 'warn',

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
            '@stylistic/no-whitespace-before-property': 'warn',
            '@stylistic/type-annotation-spacing': 'warn',
            '@stylistic/type-generic-spacing': ['warn'],
            '@stylistic/type-named-tuple-spacing': ['warn'],
            '@stylistic/array-bracket-newline': ['warn', 'consistent'],
            '@stylistic/array-bracket-spacing': ['warn', 'never'],

            // array-element-newline and object-property-newline (below) are
            // deliberately left OFF. Prettier already governs where arrays
            // and objects break onto new lines; both rules fight
            // prettier/prettier over the same decision on the same input
            // (e.g. an opening bracket sharing a line with the first
            // element, then breaking later) and neither fixer can win:
            // `eslint --fix` logs "Circular fixes detected … conflicting
            // rules in your configuration", mangles the file, and leaves
            // errors behind. Verified: with both off, the same inputs
            // converge to Prettier's output in one `--fix` pass.
            '@stylistic/arrow-parens': ['warn', 'always'],
            '@stylistic/arrow-spacing': ['warn', { before: true, after: true }],
            '@stylistic/block-spacing': 'warn',
            '@stylistic/no-extra-semi': 'warn',
            '@stylistic/curly-newline': ['warn', { consistent: true }],
            '@stylistic/semi': ['warn', 'always'],
            '@stylistic/spaced-comment': ['warn', 'always', { exceptions: ['*'] }],
            '@stylistic/multiline-comment-style': 'off',
            '@stylistic/no-trailing-spaces': ['warn', { ignoreComments: true }],
            '@stylistic/padding-line-between-statements': [
                'warn',
                { blankLine: 'always', prev: ['const', 'let', 'var'], next: '*' },
                { blankLine: 'any', prev: ['const', 'let', 'var'], next: ['const', 'let', 'var'] }
            ],
            '@stylistic/object-curly-newline': ['warn', { consistent: true }],
            '@stylistic/object-curly-spacing': ['warn', 'always'],
            '@stylistic/padded-blocks': ['warn', { blocks: 'never' }],
            '@stylistic/no-floating-decimal': 'warn',
            '@stylistic/eol-last': ['warn', 'always'],

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
    // kleine Regelmenge statt eines Ignores.
    {
        ...js.configs.recommended,
        files: ['scripts/**/*.mjs'],
        languageOptions: {
            sourceType: 'module',
            ecmaVersion: 'latest',
            globals: {
                process: 'readonly',
                console: 'readonly'
            }
        }
    },

    // ──── Angular-Templates ────
    //
    // Auf packages/ gescoped: docs/index.html ist die docsify-Seite und darf
    // nicht mit dem Angular-Parser gelesen werden.
    ...angular.configs.templateRecommended.map((config) => ({
        ...config,
        files: ['packages/**/*.html']
    })),
    { ...prettierRecommended, files: ['packages/**/*.html'] },
    {
        files: ['packages/**/*.html'],
        rules: {
            'prettier/prettier': ['error', { parser: 'angular' }]
        }
    }
];
