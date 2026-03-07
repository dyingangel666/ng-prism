import { runA11yAudit } from './a11y-runner.js';

const mockResults = {
  violations: [{ id: 'color-contrast', impact: 'serious', description: 'test', nodes: [] }],
  passes: [{ id: 'button-name', impact: null, description: 'ok', nodes: [] }],
  incomplete: [],
  inapplicable: [],
  testEngine: { name: 'axe-core', version: '4.0.0' },
  testRunner: { name: 'axe' },
  testEnvironment: { userAgent: '', windowWidth: 0, windowHeight: 0 },
  timestamp: '',
  url: '',
  toolOptions: {},
};

jest.mock('axe-core', () => ({
  __esModule: true,
  default: {
    run: jest.fn().mockResolvedValue(mockResults),
  },
}));

describe('runA11yAudit', () => {
  const mockElement = {} as Element;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should run axe-core on the given element', async () => {
    const axe = (await import('axe-core')).default;
    const result = await runA11yAudit(mockElement);

    expect(axe.run).toHaveBeenCalledWith(mockElement, {});
    expect(result).toBe(mockResults);
  });

  it('should merge global and component rules', async () => {
    const axe = (await import('axe-core')).default;

    await runA11yAudit(
      mockElement,
      { rules: { 'color-contrast': { enabled: false } } },
      { rules: { 'button-name': { enabled: false } } },
    );

    expect(axe.run).toHaveBeenCalledWith(mockElement, {
      rules: {
        'color-contrast': { enabled: false },
        'button-name': { enabled: false },
      },
    });
  });

  it('should let component rules override global rules', async () => {
    const axe = (await import('axe-core')).default;

    await runA11yAudit(
      mockElement,
      { rules: { 'color-contrast': { enabled: false } } },
      { rules: { 'color-contrast': { enabled: true } } },
    );

    expect(axe.run).toHaveBeenCalledWith(mockElement, {
      rules: {
        'color-contrast': { enabled: true },
      },
    });
  });

  it('should pass empty options when no rules configured', async () => {
    const axe = (await import('axe-core')).default;

    await runA11yAudit(mockElement);

    expect(axe.run).toHaveBeenCalledWith(mockElement, {});
  });

  it('should propagate axe-core errors', async () => {
    const axe = (await import('axe-core')).default;
    (axe.run as jest.Mock).mockRejectedValueOnce(new Error('axe failed'));

    await expect(runA11yAudit(mockElement)).rejects.toThrow('axe failed');
  });
});
