import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { stripShowcaseDecorators } from './showcase-strip.transformer.js';

export interface StripResult {
  totalFiles: number;
  strippedFiles: number;
}

const JS_EXTENSIONS = new Set(['.js', '.mjs']);

export async function stripShowcaseFromDirectory(dir: string): Promise<StripResult> {
  const entries = await readdir(dir, { recursive: true });
  const files = entries
    .filter((entry) => JS_EXTENSIONS.has(extname(entry)))
    .map((entry) => join(dir, entry));

  let strippedFiles = 0;

  for (const file of files) {
    const source = await readFile(file, 'utf-8');
    const result = stripShowcaseDecorators(source, file);
    if (result !== source) {
      await writeFile(file, result, 'utf-8');
      strippedFiles++;
    }
  }

  return { totalFiles: files.length, strippedFiles };
}
