import { readFileSync } from 'fs';
import { gzipSync } from 'zlib';
import { dirname, resolve, extname } from 'path';
import ts from 'typescript';
import type { BundleMetrics } from '../perf.types.js';

export function scanBundle(filePath: string, maxTreeDepth = 5): BundleMetrics {
  const source = readFileSync(filePath, 'utf-8');
  const sourceSize = Buffer.byteLength(source, 'utf-8');

  let gzipEstimate: number;
  try {
    gzipEstimate = gzipSync(Buffer.from(source)).length;
  } catch {
    gzipEstimate = Math.round(sourceSize * 0.31);
  }

  const sourceFile = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true);
  const importList = extractImports(sourceFile);
  const directImports = importList.length;

  const treeDepth = computeTreeDepth(filePath, importList, maxTreeDepth);

  return { sourceSize, gzipEstimate, directImports, importList, treeDepth };
}

function extractImports(sourceFile: ts.SourceFile): string[] {
  const imports: string[] = [];
  ts.forEachChild(sourceFile, (node) => {
    if (
      ts.isImportDeclaration(node) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      imports.push(node.moduleSpecifier.text);
    }
  });
  return imports;
}

function computeTreeDepth(
  filePath: string,
  imports: string[],
  maxDepth: number,
  visited = new Set<string>(),
  currentDepth = 1,
): number {
  if (currentDepth >= maxDepth) return currentDepth;

  visited.add(filePath);
  let deepest = currentDepth;
  const dir = dirname(filePath);

  for (const imp of imports) {
    if (!imp.startsWith('.')) continue;

    const resolved = resolveImport(dir, imp);
    if (!resolved || visited.has(resolved)) continue;

    try {
      const childSource = readFileSync(resolved, 'utf-8');
      const childSf = ts.createSourceFile(resolved, childSource, ts.ScriptTarget.Latest, true);
      const childImports = extractImports(childSf);
      const childDepth = computeTreeDepth(resolved, childImports, maxDepth, visited, currentDepth + 1);
      deepest = Math.max(deepest, childDepth);
    } catch {
      // File not readable — treat as leaf
    }
  }

  return deepest;
}

function resolveImport(dir: string, importPath: string): string | null {
  const extensions = ['.ts', '.tsx', '.js', '.mjs'];
  const base = resolve(dir, importPath);

  if (extname(base)) {
    const withoutExt = base.replace(/\.[^.]+$/, '');
    for (const ext of extensions) {
      try {
        readFileSync(withoutExt + ext);
        return withoutExt + ext;
      } catch { /* noop */ }
    }
  }

  for (const ext of extensions) {
    try {
      readFileSync(base + ext);
      return base + ext;
    } catch { /* noop */ }
  }

  for (const ext of extensions) {
    try {
      readFileSync(resolve(base, 'index' + ext));
      return resolve(base, 'index' + ext);
    } catch { /* noop */ }
  }

  return null;
}
