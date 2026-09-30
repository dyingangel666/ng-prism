/**
 * Lives in its own spec file because the failure has to be injected at module
 * load time: a `jest.mock` factory that throws makes `import('axe-core')`
 * reject, which the shared mock in `a11y-audit.service.spec.ts` cannot express.
 */
jest.mock('axe-core', () => {
    throw new Error('Failed to fetch dynamically imported module');
});

import { runCoreAudit } from './a11y-audit.service.js';

const mockElement = {} as Element;

describe('runCoreAudit when axe-core cannot be loaded', () => {
    it('reports that the audit is unavailable rather than surfacing the loader error', async () => {
        await expect(runCoreAudit(mockElement)).rejects.toThrow(/accessibility audit is unavailable/);
    });

    it('keeps the original loader failure as the cause', async () => {
        expect.assertions(1);

        try {
            await runCoreAudit(mockElement);
        } catch (error) {
            expect((error as Error).cause).toMatchObject({
                message: expect.stringMatching(/Failed to fetch dynamically imported module/)
            });
        }
    });
});
