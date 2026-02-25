import '@angular/compiler';
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
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
  const configPath = join(options.workspaceRoot, configFileName);

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

  const tempPath = configPath.replace(/\.ts$/, '.tmp.mjs');

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
