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
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }

  for (const entry of entries) {
    if (entry === 'node_modules' || entry === '.git') continue;

    const fullPath = join(dir, entry);
    if (!statSync(fullPath).isDirectory()) continue;

    const ngPackagePath = join(fullPath, 'ng-package.json');
    if (!existsSync(ngPackagePath)) {
      findNgPackageJsons(fullPath, libraryRoot, baseImportPath, result);
      continue;
    }

    const ngPackage = JSON.parse(readFileSync(ngPackagePath, 'utf-8'));

    if (ngPackage.dest) continue;

    const entryFile = ngPackage.lib?.entryFile ?? 'public-api.ts';
    const entryFilePath = join(fullPath, entryFile);

    if (!existsSync(entryFilePath)) continue;

    const relDir = relative(libraryRoot, fullPath);
    const importPath = posix.join(baseImportPath, relDir.split('\\').join('/'));

    result.push({ entryFile: entryFilePath, importPath });
  }
}
