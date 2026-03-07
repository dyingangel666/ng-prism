/* eslint-disable */
const { readFileSync } = require('fs');

// Reading the SWC compilation config for the spec files
const swcJestConfig = JSON.parse(
  readFileSync(`${__dirname}/.spec.swcrc`, 'utf-8')
);

// Disable .swcrc look-up by SWC core because we're passing in swcJestConfig ourselves
swcJestConfig.swcrc = false;

module.exports = {
  displayName: 'plugin-a11y',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/src/test-setup.ts'],
  transform: {
    '^.+\\.[mc]?[tj]s$': ['@swc/jest', swcJestConfig],
  },
  transformIgnorePatterns: ['node_modules/(?!.*\\.mjs$|@angular)'],
  moduleFileExtensions: ['ts', 'js', 'mjs', 'html'],
  coverageDirectory: 'test-output/jest/coverage',
};
