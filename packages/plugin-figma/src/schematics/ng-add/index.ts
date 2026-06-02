import {
  chain,
  type Rule,
  type SchematicContext,
  type Tree,
} from '@angular-devkit/schematics';
import { addPluginToConfig } from '@ng-prism/core/schematics/utils';
import type { NgAddSchemaOptions } from './schema.js';

const PLUGIN_IMPORT_NAME = 'figmaPlugin';
const PLUGIN_IMPORT_FROM = '@ng-prism/plugin-figma';
const PLUGIN_CALL = 'figmaPlugin()';

function injectPlugin(options: NgAddSchemaOptions): Rule {
  return (tree: Tree, context: SchematicContext) => {
    const configPath = options.configPath ?? 'ng-prism.config.ts';
    const changed = addPluginToConfig(tree, configPath, {
      importName: PLUGIN_IMPORT_NAME,
      importFrom: PLUGIN_IMPORT_FROM,
      call: PLUGIN_CALL,
    });
    if (changed) {
      context.logger.info(`  ${PLUGIN_IMPORT_FROM} → added to ${configPath}`);
    } else {
      context.logger.info(
        `  ${PLUGIN_IMPORT_FROM} already configured — skipped`
      );
    }
    return tree;
  };
}

function logOptionalPeersHint(): Rule {
  return (tree: Tree, context: SchematicContext) => {
    context.logger.info('');
    context.logger.info(
      '  Optional peers for screenshot/diff features (install if needed):'
    );
    context.logger.info('    npm install --save-dev html2canvas pixelmatch');
    return tree;
  };
}

export function ngAdd(options: NgAddSchemaOptions): Rule {
  return chain([injectPlugin(options), logOptionalPeersHint()]);
}
