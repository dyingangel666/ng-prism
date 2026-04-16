import ts from 'typescript';
import type { InputMeta, OutputMeta } from '../../plugin/plugin.types.js';
import { evaluateExpression, findDecorator, getDecoratorArgument, getJsDocComment } from './ast-utils.js';

/**
 * Extract all @Input(), input() and model() signal metadata from a class declaration.
 */
export function extractInputs(classDecl: ts.ClassDeclaration, checker: ts.TypeChecker): InputMeta[] {
  const inputs: InputMeta[] = [];

  for (const member of classDecl.members) {
    if (!ts.isPropertyDeclaration(member)) continue;

    const name = member.name && ts.isIdentifier(member.name) ? member.name.text : undefined;
    if (!name) continue;

    const inputDecorator = findDecorator(member, 'Input');
    if (inputDecorator) {
      const required = isDecoratorInputRequired(inputDecorator);
      const defaultValue = member.initializer ? evaluateExpression(member.initializer) : undefined;
      const doc = getJsDocComment(member, checker);
      const { type, values, rawType } = resolveDecoratorInputType(member, checker);
      inputs.push({ name, type, rawType, required, ...(values && { values }), ...(defaultValue !== undefined && { defaultValue }), ...(doc && { doc }) });
      continue;
    }

    const signalCall = getInputSignalCall(member);
    if (signalCall) {
      const required = isSignalInputRequired(signalCall);
      const defaultValue = !required && signalCall.arguments.length > 0
        ? evaluateExpression(signalCall.arguments[0])
        : undefined;
      const doc = getJsDocComment(member, checker);
      const { type, values, rawType } = resolveSignalInputType(signalCall, checker);
      inputs.push({ name, type, rawType, required, ...(values && { values }), ...(defaultValue !== undefined && { defaultValue }), ...(doc && { doc }) });
    }
  }

  return inputs;
}

/**
 * Extract all @Output() and output() signal metadata from a class declaration.
 */
export function extractOutputs(classDecl: ts.ClassDeclaration, checker: ts.TypeChecker): OutputMeta[] {
  const outputs: OutputMeta[] = [];

  for (const member of classDecl.members) {
    if (!ts.isPropertyDeclaration(member)) continue;

    const name = member.name && ts.isIdentifier(member.name) ? member.name.text : undefined;
    if (!name) continue;

    const outputDecorator = findDecorator(member, 'Output');
    if (outputDecorator) {
      const doc = getJsDocComment(member, checker);
      outputs.push({ name, ...(doc && { doc }) });
      continue;
    }

    if (isOutputSignal(member)) {
      const doc = getJsDocComment(member, checker);
      outputs.push({ name, ...(doc && { doc }) });
    }
  }

  return outputs;
}

function getInputSignalCall(member: ts.PropertyDeclaration): ts.CallExpression | null {
  const init = member.initializer;
  if (!init || !ts.isCallExpression(init)) return null;

  const expr = init.expression;

  if (ts.isIdentifier(expr) && (expr.text === 'input' || expr.text === 'model')) return init;

  if (
    ts.isPropertyAccessExpression(expr) &&
    ts.isIdentifier(expr.expression) && (expr.expression.text === 'input' || expr.expression.text === 'model') &&
    ts.isIdentifier(expr.name) && expr.name.text === 'required'
  ) {
    return init;
  }

  return null;
}

function isSignalInputRequired(callExpr: ts.CallExpression): boolean {
  const expr = callExpr.expression;
  return (
    ts.isPropertyAccessExpression(expr) &&
    ts.isIdentifier(expr.name) &&
    expr.name.text === 'required'
  );
}

function isOutputSignal(member: ts.PropertyDeclaration): boolean {
  const init = member.initializer;
  if (!init || !ts.isCallExpression(init)) return false;
  const expr = init.expression;
  return ts.isIdentifier(expr) && expr.text === 'output';
}

function resolveSignalInputType(
  callExpr: ts.CallExpression,
  checker: ts.TypeChecker,
): { type: InputMeta['type']; values?: string[]; rawType: string } {
  if (callExpr.typeArguments && callExpr.typeArguments.length > 0) {
    const resolved = checker.getTypeFromTypeNode(callExpr.typeArguments[0]);
    return mapType(resolved, checker);
  }

  if (callExpr.arguments.length > 0) {
    const argType = checker.getTypeAtLocation(callExpr.arguments[0]);
    return mapType(argType, checker);
  }

  return { type: 'unknown', rawType: 'unknown' };
}

function isDecoratorInputRequired(decorator: ts.Decorator): boolean {
  const arg = getDecoratorArgument(decorator);
  if (!arg || !ts.isObjectLiteralExpression(arg)) return false;

  for (const prop of arg.properties) {
    if (
      ts.isPropertyAssignment(prop) &&
      ts.isIdentifier(prop.name) &&
      prop.name.text === 'required'
    ) {
      return prop.initializer.kind === ts.SyntaxKind.TrueKeyword;
    }
  }
  return false;
}

function resolveDecoratorInputType(
  member: ts.PropertyDeclaration,
  checker: ts.TypeChecker,
): { type: InputMeta['type']; values?: string[]; rawType: string } {
  const tsType = checker.getTypeAtLocation(member);
  return mapType(tsType, checker);
}

function getRawTypeLabel(tsType: ts.Type, checker: ts.TypeChecker): string {
  if (tsType.flags & (ts.TypeFlags.Boolean | ts.TypeFlags.BooleanLike | ts.TypeFlags.BooleanLiteral)) {
    return 'boolean';
  }

  if (tsType.isUnion()) {
    const meaningful = tsType.types.filter(
      (t) => !(t.flags & ts.TypeFlags.Undefined) && !(t.flags & ts.TypeFlags.Null),
    );
    if (meaningful.length === 0) return checker.typeToString(tsType);
    if (meaningful.every((t) => t.flags & ts.TypeFlags.BooleanLiteral)) return 'boolean';
    if (meaningful.length === 1) return checker.typeToString(meaningful[0]);
    if (tsType.aliasSymbol) return tsType.aliasSymbol.getName();
    return meaningful.map((t) => checker.typeToString(t)).join(' | ');
  }
  return checker.typeToString(tsType);
}

function mapType(
  tsType: ts.Type,
  checker: ts.TypeChecker,
): { type: InputMeta['type']; values?: string[]; rawType: string } {
  const rawType = getRawTypeLabel(tsType, checker);

  if (tsType.flags & ts.TypeFlags.BooleanLike) {
    return { type: 'boolean', rawType };
  }
  if (tsType.flags & ts.TypeFlags.Boolean) {
    return { type: 'boolean', rawType };
  }

  if (tsType.isUnion()) {
    const filtered = tsType.types.filter(
      (t) =>
        !(t.flags & ts.TypeFlags.Undefined) &&
        !(t.flags & ts.TypeFlags.Null),
    );

    if (filtered.every((t) => t.flags & ts.TypeFlags.BooleanLiteral)) {
      return { type: 'boolean', rawType };
    }

    if (filtered.every((t) => t.isStringLiteral())) {
      const values = filtered.map((t) => (t as ts.StringLiteralType).value);
      return { type: 'union', values, rawType };
    }

    if (filtered.length === 1) {
      return { ...mapType(filtered[0], checker), rawType };
    }

    return { type: 'unknown', rawType };
  }

  if (tsType.flags & ts.TypeFlags.StringLike) {
    return { type: 'string', rawType };
  }

  if (tsType.flags & ts.TypeFlags.NumberLike) {
    return { type: 'number', rawType };
  }

  if (checker.isArrayType(tsType)) {
    return { type: 'array', rawType };
  }

  if (tsType.flags & ts.TypeFlags.Object) {
    return { type: 'object', rawType };
  }

  return { type: 'unknown', rawType };
}
