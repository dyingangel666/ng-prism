import chokidar from 'chokidar';
import { dirname } from 'path';
import { statSync } from 'fs';

export interface ChangeHandlerOptions {
  onRebuild: () => Promise<void>;
  logger: { info(msg: string): void; error(msg: string): void };
  debounceMs?: number;
}

export interface ChangeHandler {
  handleChange(filename: string | null): void;
  dispose(): void;
}

export interface WatcherHandle {
  close(): void;
}

export interface StartWatcherOptions {
  entryPoint: string;
  configFile?: string;
  ignorePaths?: string[];
  onRebuild: () => Promise<void>;
  logger: { info(msg: string): void; error(msg: string): void };
  debounceMs?: number;
}

export function createChangeHandler(options: ChangeHandlerOptions): ChangeHandler {
  const { onRebuild, logger, debounceMs = 300 } = options;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let isRebuilding = false;
  let disposed = false;

  function handleChange(filename: string | null): void {
    if (disposed) return;
    if (filename && !/\.(ts|scss|css|svg)$/.test(filename)) return;

    if (timer) clearTimeout(timer);

    timer = setTimeout(async () => {
      if (disposed || isRebuilding) return;

      isRebuilding = true;
      logger.info('ng-prism: Change detected, re-scanning...');

      try {
        await onRebuild();
        if (!disposed) {
          logger.info('ng-prism: Re-scan complete.');
        }
      } catch (err) {
        if (!disposed) {
          logger.error(`ng-prism: Re-scan failed — ${err instanceof Error ? err.message : String(err)}`);
        }
      } finally {
        isRebuilding = false;
      }
    }, debounceMs);
  }

  function dispose(): void {
    disposed = true;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  }

  return { handleChange, dispose };
}

export function startWatcher(options: StartWatcherOptions): WatcherHandle {
  const { entryPoint, configFile, ignorePaths, onRebuild, logger, debounceMs } = options;
  const handler = createChangeHandler({ onRebuild, logger, debounceMs });

  const isDir = (() => { try { return statSync(entryPoint).isDirectory(); } catch { return false; } })();
  const watchPaths: string[] = [isDir ? entryPoint : dirname(entryPoint)];
  if (configFile) {
    watchPaths.push(configFile);
  }

  const ignorePatterns: (string | RegExp)[] = [/(?:^|[/\\])(?:node_modules|\.git)[/\\]/];
  if (ignorePaths) {
    ignorePatterns.push(...ignorePaths);
  }

  const watcher = chokidar.watch(watchPaths, {
    ignored: ignorePatterns,
    ignoreInitial: true,
    persistent: true,
  });

  watcher.on('change', (filePath) => handler.handleChange(filePath));
  watcher.on('add', (filePath) => handler.handleChange(filePath));
  watcher.on('unlink', (filePath) => handler.handleChange(filePath));
  watcher.on('error', (err) => logger.error(`ng-prism: Watcher error — ${err instanceof Error ? err.message : String(err)}`));

  logger.info(`ng-prism: Watching ${watchPaths.join(', ')} for changes...`);

  return {
    close() {
      handler.dispose();
      watcher.close();
    },
  };
}
