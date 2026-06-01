import { SchematicsException, type Tree } from '@angular-devkit/schematics';
import ts from 'typescript';

export interface AddPluginToConfigOptions {
  /** Named import binding, e.g. 'jsDocPlugin' */
  importName: string;
  /** Module specifier, e.g. '@ng-prism/plugin-jsdoc' */
  importFrom: string;
  /** Factory call to insert into plugins array, e.g. 'jsDocPlugin()' */
  call: string;
}

interface Edit {
  start: number;
  end: number;
  newText: string;
}

/**
 * Adds a plugin import + factory call to the user's ng-prism.config.ts.
 * Idempotent: skips if import or call is already present.
 * Throws SchematicsException on unsupported config shapes.
 * Returns true if the file was changed.
 */
export function addPluginToConfig(
  tree: Tree,
  configPath: string,
  options: AddPluginToConfigOptions
): boolean {
  const buffer = tree.read(configPath);
  if (!buffer) {
    throw new SchematicsException(
      `${configPath} not found. Run "ng add @ng-prism/core" first.`
    );
  }
  const source = buffer.toString('utf-8');
  const sf = ts.createSourceFile(
    configPath,
    source,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true
  );

  const imports = sf.statements.filter(ts.isImportDeclaration);

  const defineConfigCall = findDefineConfigCall(sf);
  if (!defineConfigCall) {
    throw new SchematicsException(
      'Unsupported config: defineConfig() call not found at default export.'
    );
  }
  const arg = defineConfigCall.arguments[0];
  if (!arg || !ts.isObjectLiteralExpression(arg)) {
    throw new SchematicsException(
      'Unsupported config: defineConfig argument must be an object literal.'
    );
  }
  const objectLiteral = arg;

  const pluginsProp = findPluginsProperty(objectLiteral);
  if (pluginsProp && !ts.isArrayLiteralExpression(pluginsProp.initializer)) {
    throw new SchematicsException(
      'Unsupported config: plugins must be an array literal.'
    );
  }

  const importAlreadyPresent = imports.some((imp) =>
    importHasNamedBinding(imp, options.importFrom, options.importName)
  );

  const callAlreadyPresent =
    !!pluginsProp &&
    (pluginsProp.initializer as ts.ArrayLiteralExpression).elements.some(
      (el) =>
        ts.isCallExpression(el) &&
        ts.isIdentifier(el.expression) &&
        el.expression.text === options.importName
    );

  if (importAlreadyPresent && callAlreadyPresent) return false;

  const edits: Edit[] = [];

  if (!importAlreadyPresent) {
    const insertPos = imports.length > 0 ? imports[imports.length - 1].end : 0;
    edits.push({
      start: insertPos,
      end: insertPos,
      newText: `\nimport { ${options.importName} } from '${options.importFrom}';`,
    });
  }

  if (!callAlreadyPresent) {
    if (!pluginsProp) {
      const insertPos = objectLiteral.getStart(sf) + 1;
      edits.push({
        start: insertPos,
        end: insertPos,
        newText: `\n  plugins: [${options.call}],`,
      });
    } else {
      const arr = pluginsProp.initializer as ts.ArrayLiteralExpression;
      if (arr.elements.length === 0) {
        edits.push({
          start: arr.getStart(sf),
          end: arr.getEnd(),
          newText: `[${options.call}]`,
        });
      } else {
        const insertPos = arr.getEnd() - 1;
        edits.push({
          start: insertPos,
          end: insertPos,
          newText: `, ${options.call}`,
        });
      }
    }
  }

  edits.sort((a, b) => b.start - a.start);
  let result = source;
  for (const e of edits) {
    result = result.slice(0, e.start) + e.newText + result.slice(e.end);
  }

  tree.overwrite(configPath, result);
  return true;
}

function findDefineConfigCall(sf: ts.SourceFile): ts.CallExpression | null {
  for (const stmt of sf.statements) {
    if (!ts.isExportAssignment(stmt) || stmt.isExportEquals) continue;
    const expr = stmt.expression;
    if (
      ts.isCallExpression(expr) &&
      ts.isIdentifier(expr.expression) &&
      expr.expression.text === 'defineConfig'
    ) {
      return expr;
    }
  }
  return null;
}

function findPluginsProperty(
  obj: ts.ObjectLiteralExpression
): ts.PropertyAssignment | null {
  for (const prop of obj.properties) {
    if (
      ts.isPropertyAssignment(prop) &&
      ts.isIdentifier(prop.name) &&
      prop.name.text === 'plugins'
    ) {
      return prop;
    }
  }
  return null;
}

function importHasNamedBinding(
  imp: ts.ImportDeclaration,
  moduleSpecifier: string,
  binding: string
): boolean {
  if (!ts.isStringLiteral(imp.moduleSpecifier)) return false;
  if (imp.moduleSpecifier.text !== moduleSpecifier) return false;
  const clause = imp.importClause;
  if (!clause?.namedBindings) return false;
  if (!ts.isNamedImports(clause.namedBindings)) return false;
  return clause.namedBindings.elements.some((el) => el.name.text === binding);
}
