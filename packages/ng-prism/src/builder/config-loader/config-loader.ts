import '@angular/compiler';
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'fs';
import { resolve, sep } from 'path';
import { pathToFileURL } from 'url';
import ts from 'typescript';
import type { NgPrismConfig } from '../../plugin/plugin.types.js';

export interface ConfigLoaderOptions {
  workspaceRoot: string;
  configFileName?: string;
}

const DEFAULT_CONFIG_FILE = 'ng-prism.config.ts';

export async function loadConfig(options: ConfigLoaderOptions): Promise<NgPrismConfig> {
  const configFileName = options.configFileName ?? DEFAULT_CONFIG_FILE;
  const workspaceRoot = resolve(options.workspaceRoot);
  const configPath = resolve(workspaceRoot, configFileName);

  if (configPath !== workspaceRoot && !configPath.startsWith(workspaceRoot + sep)) {
    throw new Error(
      `ng-prism: configFile "${configFileName}" resolves outside workspace root (${workspaceRoot}). ` +
      `Provide a path relative to the workspace.`,
    );
  }

  if (!existsSync(configPath)) {
    return {};
  }

  const source = readFileSync(configPath, 'utf-8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      esModuleInterop: true,
    },
  });

  const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const tempPath = configPath.replace(/\.ts$/, `.${uniqueSuffix}.tmp.mjs`);

  try {
    writeFileSync(tempPath, transpiled.outputText, 'utf-8');
    const module = await import(pathToFileURL(tempPath).href);
    return module.default ?? {};
  } finally {
    if (existsSync(tempPath)) {
      unlinkSync(tempPath);
    }
  }
}
