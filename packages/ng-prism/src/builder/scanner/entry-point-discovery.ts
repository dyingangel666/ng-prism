import { readdirSync, readFileSync, statSync, existsSync } from 'fs';
import { join, relative, posix } from 'path';

export interface DiscoveredEntryPoint {
  entryFile: string;
  importPath: string;
}

export function discoverSecondaryEntryPoints(
  libraryRoot: string,
  baseImportPath: string,
): DiscoveredEntryPoint[] {
  const entryPoints: DiscoveredEntryPoint[] = [];
  findNgPackageJsons(libraryRoot, libraryRoot, baseImportPath, entryPoints);
  return entryPoints;
}

function findNgPackageJsons(
  dir: string,
  libraryRoot: string,
  baseImportPath: string,
  result: DiscoveredEntryPoint[],
): void {
  const isLibraryRoot = dir === libraryRoot;
  const ngPackagePath = join(dir, 'ng-package.json');

  if (existsSync(ngPackagePath)) {
    const ngPackage = JSON.parse(readFileSync(ngPackagePath, 'utf-8'));

    if (!ngPackage.dest) {
      const entryFile = ngPackage.lib?.entryFile ?? 'public-api.ts';
      const entryFilePath = join(dir, entryFile);

      if (existsSync(entryFilePath)) {
        const relDir = relative(libraryRoot, dir);
        const importPath = relDir === ''
          ? baseImportPath
          : posix.join(baseImportPath, relDir.split('\\').join('/'));
        result.push({ entryFile: entryFilePath, importPath });
      }

      if (!isLibraryRoot) return;
    }
  }

  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }

  for (const entry of entries) {
    if (entry === 'node_modules' || entry === '.git') continue;

    const fullPath = join(dir, entry);
    try {
      if (!statSync(fullPath).isDirectory()) continue;
    } catch {
      continue;
    }

    findNgPackageJsons(fullPath, libraryRoot, baseImportPath, result);
  }
}
