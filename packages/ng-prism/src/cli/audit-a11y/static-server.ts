import { createServer, type Server } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
};

export interface StaticServerHandle {
  url: string;
  port: number;
  close(): Promise<void>;
}

/**
 * Minimal static file server for Angular SPA output.
 * Serves files relative to `root`; for unknown routes returns index.html (SPA fallback).
 */
export function startStaticServer(root: string, port: number): Promise<StaticServerHandle> {
  const absRoot = resolve(root);

  if (!existsSync(absRoot)) {
    return Promise.reject(new Error(`Static root does not exist: ${absRoot}`));
  }

  const indexPath = join(absRoot, 'index.html');
  if (!existsSync(indexPath)) {
    return Promise.reject(new Error(`No index.html found in ${absRoot}`));
  }

  const server: Server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    let relPath = decodeURIComponent(url.pathname);
    if (relPath === '/' || relPath === '') relPath = '/index.html';

    const normalized = normalize(relPath).replace(/^[/\\]+/, '');
    const filePath = join(absRoot, normalized);

    // Path traversal guard.
    if (!filePath.startsWith(absRoot)) {
      res.writeHead(403).end();
      return;
    }

    const target = existsSync(filePath) && statSync(filePath).isFile()
      ? filePath
      : indexPath;

    const ext = extname(target).toLowerCase();
    const mime = MIME[ext] ?? 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime });
    createReadStream(target).pipe(res);
  });

  return new Promise((resolveFn, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => {
      resolveFn({
        url: `http://127.0.0.1:${port}`,
        port,
        close: () => new Promise<void>((r) => server.close(() => r())),
      });
    });
  });
}
