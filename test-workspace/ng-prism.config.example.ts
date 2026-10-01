import { defineConfig } from '@ng-prism/core/config';
import { boxModelPlugin } from '@ng-prism/plugin-box-model';
import { coveragePlugin } from '@ng-prism/plugin-coverage';
import { figmaPlugin } from '@ng-prism/plugin-figma';
import { jsDocPlugin } from '@ng-prism/plugin-jsdoc';
import { perfPlugin } from '@ng-prism/plugin-perf';
import { visualRegressionPlugin } from '@ng-prism/plugin-visual-regression';

export default defineConfig({
    plugins: [figmaPlugin(), jsDocPlugin(), perfPlugin(), coveragePlugin(), boxModelPlugin(), visualRegressionPlugin({ assetBaseUrl: 'assets/' })]
});
