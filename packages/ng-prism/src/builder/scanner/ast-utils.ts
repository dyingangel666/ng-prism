import ts from 'typescript';

/**
 * Statically evaluate an AST expression node.
 * Returns `undefined` for non-evaluable expressions (variables, function calls, spread).
 */
export function evaluateExpression(node: ts.Expression): unknown {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }

  if (ts.isNumericLiteral(node)) {
    return Number(node.text);
  }

  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (node.kind === ts.SyntaxKind.NullKeyword) return null;
  if (node.kind === ts.SyntaxKind.UndefinedKeyword) return undefined;

  if (ts.isParenthesizedExpression(node)) {
    return evaluateExpression(node.expression);
  }

  if (ts.isPrefixUnaryExpression(node) && node.operator === ts.SyntaxKind.MinusToken) {
    const operand = evaluateExpression(node.operand);
    if (typeof operand === 'number') return -operand;
    return undefined;
  }

  if (ts.isArrayLiteralExpression(node)) {
    const result: unknown[] = [];
    for (const element of node.elements) {
      if (ts.isSpreadElement(element)) return undefined;
      result.push(evaluateExpression(element));
    }
    return result;
  }

  if (ts.isObjectLiteralExpression(node)) {
    const result: Record<string, unknown> = {};
    for (const prop of node.properties) {
      if (ts.isSpreadAssignment(prop)) return undefined;
      if (!ts.isPropertyAssignment(prop)) return undefined;

      const key = ts.isIdentifier(prop.name)
        ? prop.name.text
        : ts.isStringLiteral(prop.name)
          ? prop.name.text
          : undefined;
      if (key === undefined) return undefined;

      result[key] = evaluateExpression(prop.initializer);
    }
    return result;
  }

  return undefined;
}

/**
 * Find a decorator by name on a class or property declaration.
 */
export function findDecorator(
  node: ts.ClassDeclaration | ts.PropertyDeclaration,
  name: string,
): ts.Decorator | undefined {
  const decorators = ts.getDecorators(node);
  if (!decorators) return undefined;

  return decorators.find((d) => {
    const expr = d.expression;
    // @Name
    if (ts.isIdentifier(expr)) return expr.text === name;
    // @Name(...)
    if (ts.isCallExpression(expr) && ts.isIdentifier(expr.expression)) {
      return expr.expression.text === name;
    }
    return false;
  });
}

/**
 * Extract the first argument of a decorator call expression.
 * Returns undefined if the decorator is not a call or has no arguments.
 */
export function getDecoratorArgument(decorator: ts.Decorator): ts.Expression | undefined {
  const expr = decorator.expression;
  if (ts.isCallExpression(expr) && expr.arguments.length > 0) {
    return expr.arguments[0];
  }
  return undefined;
}

/**
 * Get the JSDoc comment for a node.
 */
export function getJsDocComment(node: ts.Node, checker: ts.TypeChecker): string | undefined {
  const symbol = checker.getSymbolAtLocation(
    ts.isClassDeclaration(node) || ts.isPropertyDeclaration(node)
      ? (node.name ?? node)
      : node,
  );
  if (!symbol) return undefined;

  const doc = ts.displayPartsToString(symbol.getDocumentationComment(checker)).trim();
  return doc || undefined;
}
