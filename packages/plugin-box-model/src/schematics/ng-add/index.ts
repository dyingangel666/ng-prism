import {
  chain,
  type Rule,
  type SchematicContext,
  type Tree,
} from '@angular-devkit/schematics';
import { addPluginToConfig } from '@ng-prism/core/schematics/utils';
import type { NgAddSchemaOptions } from './schema.js';

const PLUGIN_IMPORT_NAME = 'boxModelPlugin';
const PLUGIN_IMPORT_FROM = '@ng-prism/plugin-box-model';
const PLUGIN_CALL = 'boxModelPlugin()';

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

export function ngAdd(options: NgAddSchemaOptions): Rule {
  return chain([injectPlugin(options)]);
}
