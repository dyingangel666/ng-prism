import * as browserEntry from './index.browser.js';
import * as nodeEntry from './index.js';

/**
 * `package.json` maps every export condition to the same `index.d.ts`, while
 * "browser" resolves to `index.browser.js` and everything else to `index.js`.
 * That only works if both bundles export the same values: a symbol declared
 * by the shared `.d.ts` but missing from the browser bundle type-checks in a
 * consumer's app and then fails the bundler with "No matching export".
 */
describe('entry point parity', () => {
    it('exports the same symbols from the node and browser entries', () => {
        expect(Object.keys(browserEntry).sort()).toEqual(Object.keys(nodeEntry).sort());
    });

    it('exports the threshold helpers from both entries', () => {
        // The build-time hooks cannot be reached from a browser bundle, so these
        // live in their own module instead of being re-exported through the
        // Node-only plugin entry.
        expect(browserEntry.DEFAULT_VRT_THRESHOLDS).toEqual(nodeEntry.DEFAULT_VRT_THRESHOLDS);
        expect(browserEntry.resolveVrtThresholds(90)).toEqual({ score: 90 });
    });
});
