const path = require('path');

const swcJestConfig = {
  jsc: {
    target: 'es2017',
    parser: {
      syntax: 'typescript',
      decorators: true,
      dynamicImport: true,
    },
    transform: {
      decoratorMetadata: true,
      legacyDecorator: true,
    },
    keepClassNames: true,
    externalHelpers: false,
    loose: true,
  },
  module: {
    type: 'es6',
  },
  sourceMaps: true,
};

module.exports = {
  displayName: 'test-workspace',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  setupFiles: ['<rootDir>/jest.setup.ts'],
  roots: ['<rootDir>/projects/test-lib/src/lib/components'],
  testMatch: ['**/*.spec.ts'],
  moduleFileExtensions: ['ts', 'js', 'mjs'],
  transform: {
    '^.+\\.[mc]?[tj]s$': [
      path.resolve(__dirname, '../node_modules/@swc/jest'),
      swcJestConfig,
    ],
  },
  transformIgnorePatterns: [
    '/node_modules/(?!.*\\.mjs$|@angular|ng-prism|@ng-prism)',
  ],
  moduleNameMapper: {
    '^@ng-prism/core$': path.resolve(__dirname, '../packages/ng-prism/src/index.ts'),
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['json-summary', 'text'],
  collectCoverageFrom: [
    'projects/test-lib/src/lib/components/**/*.component.ts',
    '!**/*.spec.ts',
  ],
};
