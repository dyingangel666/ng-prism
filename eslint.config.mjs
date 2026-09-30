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
            '@stylistic/array-element-newline': ['warn', 'consistent'],
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
            '@stylistic/object-property-newline': ['warn', { allowAllPropertiesOnSameLine: true }],
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

    // ──── Fixtures, Mocks und Specs ────
    //
    // Die Fixtures unter __fixtures__ sind Eingabedaten für den Scanner, keine
    // Produktivkomponenten: sie tragen absichtlich fremde Selektoren wie
    // my-button oder lib-button, weil genau das getestet wird.
    {
        files: ['**/__fixtures__/**/*.ts', '**/__mocks__/**/*.ts', '**/*.spec.ts'],
        rules: {
            '@angular-eslint/prefer-on-push-component-change-detection': 'off',
            '@typescript-eslint/no-empty-function': 'off',
            'unused-imports/no-unused-vars': 'off',

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
