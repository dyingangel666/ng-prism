jest.mock('chokidar', () => ({ __esModule: true, default: { watch: jest.fn() } }));

import chokidar from 'chokidar';
import { createChangeHandler, startWatcher } from './prism-watcher.js';

const mockChokidarWatch = chokidar.watch as jest.Mock;

function createLogger() {
  return {
    info: jest.fn(),
    error: jest.fn(),
  };
}

describe('startWatcher', () => {
  function makeMockWatcher() {
    const w = { on: jest.fn(), close: jest.fn() };
    w.on.mockReturnValue(w);
    return w;
  }

  beforeEach(() => {
    mockChokidarWatch.mockReset();
  });

  it('should pass ignorePaths to chokidar ignored option', () => {
    const mockWatcher = makeMockWatcher();
    mockChokidarWatch.mockReturnValue(mockWatcher);
    const logger = createLogger();
    const handle = startWatcher({
      entryPoint: '/some/lib',
      ignorePaths: ['/some/lib/.ng-prism'],
      onRebuild: jest.fn().mockResolvedValue(undefined),
      logger,
    });

    const [, watchOptions] = mockChokidarWatch.mock.calls[0];
    expect(Array.isArray(watchOptions.ignored)).toBe(true);
    expect(watchOptions.ignored).toContain('/some/lib/.ng-prism');

    handle.close();
  });

  it('should only include default ignore pattern when ignorePaths is not provided', () => {
    const mockWatcher = makeMockWatcher();
    mockChokidarWatch.mockReturnValue(mockWatcher);
    const logger = createLogger();
    const handle = startWatcher({
      entryPoint: '/some/lib',
      onRebuild: jest.fn().mockResolvedValue(undefined),
      logger,
    });

    const [, watchOptions] = mockChokidarWatch.mock.calls[0];
    expect(Array.isArray(watchOptions.ignored)).toBe(true);
    expect(watchOptions.ignored).toHaveLength(1);
    expect(watchOptions.ignored[0]).toBeInstanceOf(RegExp);

    handle.close();
  });
});

describe('createChangeHandler', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('should call onRebuild after debounce period', async () => {
    const onRebuild = jest.fn().mockResolvedValue(undefined);
    const logger = createLogger();
    const handler = createChangeHandler({ onRebuild, logger, debounceMs: 100 });

    handler.handleChange('foo.ts');
    expect(onRebuild).not.toHaveBeenCalled();

    jest.advanceTimersByTime(100);
    await Promise.resolve();

    expect(onRebuild).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith('ng-prism: Change detected, re-scanning...');

    handler.dispose();
  });

  it('should debounce rapid changes into a single rebuild', async () => {
    const onRebuild = jest.fn().mockResolvedValue(undefined);
    const logger = createLogger();
    const handler = createChangeHandler({ onRebuild, logger, debounceMs: 100 });

    handler.handleChange('a.ts');
    jest.advanceTimersByTime(50);
    handler.handleChange('b.ts');
    jest.advanceTimersByTime(50);
    handler.handleChange('c.ts');
    jest.advanceTimersByTime(100);
    await Promise.resolve();

    expect(onRebuild).toHaveBeenCalledTimes(1);

    handler.dispose();
  });

  it('should ignore non-matching file extensions', () => {
    const onRebuild = jest.fn().mockResolvedValue(undefined);
    const logger = createLogger();
    const handler = createChangeHandler({ onRebuild, logger, debounceMs: 100 });

    handler.handleChange('readme.md');
    handler.handleChange('image.png');
    handler.handleChange('data.json');

    jest.advanceTimersByTime(200);

    expect(onRebuild).not.toHaveBeenCalled();

    handler.dispose();
  });

  it('should handle null filename (triggers rebuild)', async () => {
    const onRebuild = jest.fn().mockResolvedValue(undefined);
    const logger = createLogger();
    const handler = createChangeHandler({ onRebuild, logger, debounceMs: 100 });

    handler.handleChange(null);
    jest.advanceTimersByTime(100);
    await Promise.resolve();

    expect(onRebuild).toHaveBeenCalledTimes(1);

    handler.dispose();
  });

  it('should not crash when onRebuild throws', async () => {
    const onRebuild = jest.fn().mockRejectedValue(new Error('scan failed'));
    const logger = createLogger();
    const handler = createChangeHandler({ onRebuild, logger, debounceMs: 100 });

    handler.handleChange('foo.ts');
    jest.advanceTimersByTime(100);
    await Promise.resolve();
    await Promise.resolve();

    expect(logger.error).toHaveBeenCalledWith('ng-prism: Re-scan failed — scan failed');

    handler.dispose();
  });

  it('should not rebuild while already rebuilding', async () => {
    let resolveRebuild!: () => void;
    const onRebuild = jest.fn().mockImplementation(
      () => new Promise<void>((resolve) => { resolveRebuild = resolve; }),
    );
    const logger = createLogger();
    const handler = createChangeHandler({ onRebuild, logger, debounceMs: 100 });

    handler.handleChange('first.ts');
    jest.advanceTimersByTime(100);
    await Promise.resolve();
    expect(onRebuild).toHaveBeenCalledTimes(1);

    handler.handleChange('second.ts');
    jest.advanceTimersByTime(100);
    await Promise.resolve();
    expect(onRebuild).toHaveBeenCalledTimes(1);

    resolveRebuild();
    await Promise.resolve();

    handler.handleChange('third.ts');
    jest.advanceTimersByTime(100);
    await Promise.resolve();

    expect(onRebuild).toHaveBeenCalledTimes(2);

    handler.dispose();
  });

  it('should not rebuild after dispose', () => {
    const onRebuild = jest.fn().mockResolvedValue(undefined);
    const logger = createLogger();
    const handler = createChangeHandler({ onRebuild, logger, debounceMs: 100 });

    handler.handleChange('foo.ts');
    handler.dispose();
    jest.advanceTimersByTime(200);

    expect(onRebuild).not.toHaveBeenCalled();
  });

  it('should log re-scan complete on success', async () => {
    const onRebuild = jest.fn().mockResolvedValue(undefined);
    const logger = createLogger();
    const handler = createChangeHandler({ onRebuild, logger, debounceMs: 100 });

    handler.handleChange('foo.ts');
    jest.advanceTimersByTime(100);
    await Promise.resolve();
    await Promise.resolve();

    expect(logger.info).toHaveBeenCalledWith('ng-prism: Re-scan complete.');

    handler.dispose();
  });
});
