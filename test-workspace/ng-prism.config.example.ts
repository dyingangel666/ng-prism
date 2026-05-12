import { defineConfig } from '@ng-prism/core/config';
import { figmaPlugin } from '@ng-prism/plugin-figma';
import { jsDocPlugin } from '@ng-prism/plugin-jsdoc';
import { perfPlugin } from '@ng-prism/plugin-perf';
import { coveragePlugin } from '@ng-prism/plugin-coverage';
import { boxModelPlugin } from '@ng-prism/plugin-box-model';

export default defineConfig({
  plugins: [
    figmaPlugin(),
    jsDocPlugin(),
    perfPlugin(),
    coveragePlugin(),
    boxModelPlugin(),
  ],
});
