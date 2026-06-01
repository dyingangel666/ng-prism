/** Minimal ora stub for Jest (avoids ESM chain from @angular-devkit/schematics/testing) */
const ora = () => ({
  start: () => ({ succeed: jest.fn(), fail: jest.fn(), stop: jest.fn() }),
  succeed: jest.fn(),
  fail: jest.fn(),
  stop: jest.fn(),
});
module.exports = ora;
module.exports.default = ora;
