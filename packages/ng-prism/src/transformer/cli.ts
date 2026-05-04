#!/usr/bin/env node
import { stripShowcaseFromDirectory } from './strip-directory.js';

const dir = process.argv[2];

if (!dir) {
  console.error('Usage: ng-prism-strip <dist-dir>');
  process.exit(1);
}

stripShowcaseFromDirectory(dir).then(
  (result) => {
    console.log(
      `Stripped @Showcase from ${result.strippedFiles} of ${result.totalFiles} files.`,
    );
  },
  (error: Error) => {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  },
);
