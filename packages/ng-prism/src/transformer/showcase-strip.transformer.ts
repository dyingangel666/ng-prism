import ts from 'typescript';

const SHOWCASE_MODULE_PREFIXES = ['@ng-prism/core', 'ng-prism'];

function isShowcaseModule(specifier: string): boolean {
  return SHOWCASE_MODULE_PREFIXES.some(
    (prefix) => specifier === prefix || specifier.startsWith(prefix + '/')
  );
}

function isShowcaseCall(expr: ts.Expression, names: Set<string>): boolean {
  return (
    ts.isCallExpression(expr) &&
    ts.isIdentifier(expr.expression) &&
    names.has(expr.expression.text)
  );
}

function isLoweredShowcaseCall(
  expr: ts.Expression,
  names: Set<string>
): boolean {
  if (!ts.isCallExpression(expr)) return false;
  return isShowcaseCall(expr.expression, names);
}

interface DecorateResult {
  action: 'remove' | 'replace';
  statement?: ts.Statement;
}

function tryHandleDecorateStatement(
  stmt: ts.ExpressionStatement,
  names: Set<string>,
  factory: ts.NodeFactory
): DecorateResult | undefined {
  const expr = stmt.expression;
  if (
    !ts.isBinaryExpression(expr) ||
    expr.operatorToken.kind !== ts.SyntaxKind.EqualsToken
  ) {
    return undefined;
  }

  const chain: ts.BinaryExpression[] = [];
  let current: ts.Expression = expr;
  while (
    ts.isBinaryExpression(current) &&
    current.operatorToken.kind === ts.SyntaxKind.EqualsToken
  ) {
    chain.push(current);
    current = current.right;
  }

  const rhs = current;
  if (
    !ts.isCallExpression(rhs) ||
    !ts.isIdentifier(rhs.expression) ||
    rhs.expression.text !== '__decorate'
  ) {
    return undefined;
  }

  const args = rhs.arguments;
  if (args.length < 2 || !ts.isArrayLiteralExpression(args[0])) {
    return undefined;
  }

  const decoratorArray = args[0] as ts.ArrayLiteralExpression;
  const hasShowcase = decoratorArray.elements.some((el) =>
    isShowcaseCall(el, names)
  );
  if (!hasShowcase) return undefined;

  const remaining = decoratorArray.elements.filter(
    (el) => !isShowcaseCall(el, names)
  );

  if (remaining.length === 0) {
    return { action: 'remove' };
  }

  const newArray = factory.updateArrayLiteralExpression(
    decoratorArray,
    remaining
  );
  const newCall = factory.updateCallExpression(
    rhs,
    rhs.expression,
    rhs.typeArguments,
    [newArray, ...args.slice(1)]
  );

  let newRhs: ts.Expression = newCall;
  for (let i = chain.length - 1; i >= 0; i--) {
    const link = chain[i];
    newRhs = factory.updateBinaryExpression(
      link,
      link.left,
      link.operatorToken,
      newRhs
    );
  }

  const newStmt = factory.updateExpressionStatement(stmt, newRhs);
  return { action: 'replace', statement: newStmt };
}

function isShowcaseDecorator(d: ts.Decorator, names: Set<string>): boolean {
  return (
    ts.isCallExpression(d.expression) &&
    ts.isIdentifier(d.expression.expression) &&
    names.has(d.expression.expression.text)
  );
}

function stripNativeDecorators(
  node: ts.ClassDeclaration,
  names: Set<string>,
  factory: ts.NodeFactory
): ts.ClassDeclaration | undefined {
  const decorators = ts.getDecorators(node);
  if (!decorators) return undefined;

  const keptDecorators = decorators.filter(
    (d) => !isShowcaseDecorator(d, names)
  );
  if (keptDecorators.length === decorators.length) return undefined;

  const modifiers = ts.getModifiers(node) ?? [];

  return factory.updateClassDeclaration(
    node,
    [...keptDecorators, ...modifiers],
    node.name,
    node.typeParameters,
    node.heritageClauses,
    node.members
  );
}

interface ImportInfo {
  localNames: Set<string>;
  declarations: Set<ts.ImportDeclaration>;
}

function findShowcaseImports(sourceFile: ts.SourceFile): ImportInfo {
  const localNames = new Set<string>();
  const declarations = new Set<ts.ImportDeclaration>();

  for (const stmt of sourceFile.statements) {
    if (!ts.isImportDeclaration(stmt)) continue;
    if (!ts.isStringLiteral(stmt.moduleSpecifier)) continue;
    if (!isShowcaseModule(stmt.moduleSpecifier.text)) continue;

    const namedBindings = stmt.importClause?.namedBindings;
    if (!namedBindings || !ts.isNamedImports(namedBindings)) continue;

    for (const spec of namedBindings.elements) {
      const importedName = (spec.propertyName ?? spec.name).text;
      if (importedName === 'Showcase') {
        localNames.add(spec.name.text);
        declarations.add(stmt);
      }
    }
  }

  return { localNames, declarations };
}

function cleanupImports(
  statements: ts.Statement[],
  info: ImportInfo,
  factory: ts.NodeFactory
): ts.Statement[] {
  return statements.reduce<ts.Statement[]>((acc, stmt) => {
    if (!ts.isImportDeclaration(stmt) || !info.declarations.has(stmt)) {
      acc.push(stmt);
      return acc;
    }

    const namedBindings = stmt.importClause?.namedBindings;
    if (!namedBindings || !ts.isNamedImports(namedBindings)) {
      acc.push(stmt);
      return acc;
    }

    const remaining = namedBindings.elements.filter((spec) => {
      const importedName = (spec.propertyName ?? spec.name).text;
      return importedName !== 'Showcase';
    });

    if (remaining.length === 0) return acc;

    acc.push(
      factory.updateImportDeclaration(
        stmt,
        stmt.modifiers,
        factory.updateImportClause(
          stmt.importClause!,
          stmt.importClause!.isTypeOnly,
          stmt.importClause!.name,
          factory.updateNamedImports(namedBindings, remaining)
        ),
        stmt.moduleSpecifier,
        stmt.attributes
      )
    );
    return acc;
  }, []);
}

export function createShowcaseStripTransformer(): ts.TransformerFactory<ts.SourceFile> {
  return (context) => {
    const factory = context.factory;

    return (sourceFile) => {
      const importInfo = findShowcaseImports(sourceFile);
      if (importInfo.localNames.size === 0) return sourceFile;

      const names = importInfo.localNames;
      const filtered: ts.Statement[] = [];

      for (const stmt of sourceFile.statements) {
        if (ts.isExpressionStatement(stmt)) {
          if (isLoweredShowcaseCall(stmt.expression, names)) continue;

          const decorateResult = tryHandleDecorateStatement(
            stmt,
            names,
            factory
          );
          if (decorateResult) {
            if (
              decorateResult.action === 'replace' &&
              decorateResult.statement
            ) {
              filtered.push(decorateResult.statement);
            }
            continue;
          }
        }

        if (ts.isClassDeclaration(stmt)) {
          const stripped = stripNativeDecorators(stmt, names, factory);
          if (stripped) {
            filtered.push(stripped);
            continue;
          }
        }

        filtered.push(stmt);
      }

      const cleaned = cleanupImports(filtered, importInfo, factory);
      return factory.updateSourceFile(sourceFile, cleaned);
    };
  };
}

interface LeakLocation {
  name: string;
  line: number;
}

function findShowcaseLeak(
  sourceFile: ts.SourceFile,
  names: Set<string>
): LeakLocation | undefined {
  let leak: LeakLocation | undefined;

  function visit(node: ts.Node): void {
    if (leak) return;
    if (ts.isIdentifier(node) && names.has(node.text)) {
      const { line } = sourceFile.getLineAndCharacterOfPosition(
        node.getStart(sourceFile)
      );
      leak = { name: node.text, line: line + 1 };
      return;
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return leak;
}

export function stripShowcaseDecorators(
  source: string,
  fileName = 'file.ts'
): string {
  const sourceFile = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true
  );

  const importInfo = findShowcaseImports(sourceFile);
  if (importInfo.localNames.size === 0) return source;

  const result = ts.transform(sourceFile, [createShowcaseStripTransformer()]);
  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
  const output = printer.printFile(result.transformed[0]);
  result.dispose();

  const audited = ts.createSourceFile(
    fileName,
    output,
    ts.ScriptTarget.Latest,
    true
  );
  const leak = findShowcaseLeak(audited, importInfo.localNames);
  if (leak) {
    throw new Error(
      `[ng-prism] Showcase reference '${leak.name}' left in output after stripping at ${fileName}:${leak.line}. ` +
        `The Showcase import was removed but a reference remains — this would cause a ReferenceError at runtime. ` +
        `This is a transformer bug; please report the input source.`
    );
  }

  return output;
}
