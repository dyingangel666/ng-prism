import ts from 'typescript';
import type { InputMeta, OutputMeta } from '../../plugin/plugin.types.js';
import { evaluateExpression, findDecorator, getDecoratorArgument, getJsDocComment } from './ast-utils.js';

/**
 * Extract all @Input() metadata from a class declaration.
 */
export function extractInputs(classDecl: ts.ClassDeclaration, checker: ts.TypeChecker): InputMeta[] {
  const inputs: InputMeta[] = [];

  for (const member of classDecl.members) {
    if (!ts.isPropertyDeclaration(member)) continue;

    const inputDecorator = findDecorator(member, 'Input');
    if (!inputDecorator) continue;

    const name = member.name && ts.isIdentifier(member.name) ? member.name.text : undefined;
    if (!name) continue;

    const required = isInputRequired(inputDecorator);
    const defaultValue = member.initializer ? evaluateExpression(member.initializer) : undefined;
    const doc = getJsDocComment(member, checker);
    const { type, values } = resolveInputType(member, checker);

    const input: InputMeta = { name, type, required, ...(values && { values }), ...(defaultValue !== undefined && { defaultValue }), ...(doc && { doc }) };
    inputs.push(input);
  }

  return inputs;
}

/**
 * Extract all @Output() metadata from a class declaration.
 */
export function extractOutputs(classDecl: ts.ClassDeclaration, checker: ts.TypeChecker): OutputMeta[] {
  const outputs: OutputMeta[] = [];

  for (const member of classDecl.members) {
    if (!ts.isPropertyDeclaration(member)) continue;

    const outputDecorator = findDecorator(member, 'Output');
    if (!outputDecorator) continue;

    const name = member.name && ts.isIdentifier(member.name) ? member.name.text : undefined;
    if (!name) continue;

    const doc = getJsDocComment(member, checker);
    const output: OutputMeta = { name, ...(doc && { doc }) };
    outputs.push(output);
  }

  return outputs;
}

function isInputRequired(decorator: ts.Decorator): boolean {
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

function resolveInputType(
  member: ts.PropertyDeclaration,
  checker: ts.TypeChecker,
): { type: InputMeta['type']; values?: string[] } {
  const tsType = checker.getTypeAtLocation(member);
  return mapType(tsType, checker);
}

function mapType(
  tsType: ts.Type,
  checker: ts.TypeChecker,
): { type: InputMeta['type']; values?: string[] } {
  // Boolean check first (before union, since boolean is internally a union of true|false)
  if (tsType.flags & ts.TypeFlags.BooleanLike) {
    return { type: 'boolean' };
  }
  if (tsType.flags & ts.TypeFlags.Boolean) {
    return { type: 'boolean' };
  }

  // Union types
  if (tsType.isUnion()) {
    const filtered = tsType.types.filter(
      (t) =>
        !(t.flags & ts.TypeFlags.Undefined) &&
        !(t.flags & ts.TypeFlags.Null),
    );

    // Boolean union (true | false) -> boolean
    if (filtered.every((t) => t.flags & ts.TypeFlags.BooleanLiteral)) {
      return { type: 'boolean' };
    }

    // String literal union -> union with values
    if (filtered.every((t) => t.isStringLiteral())) {
      const values = filtered.map((t) => (t as ts.StringLiteralType).value);
      return { type: 'union', values };
    }

    // Mixed union without literals -> unknown
    return { type: 'unknown' };
  }

  if (tsType.flags & ts.TypeFlags.StringLike) {
    return { type: 'string' };
  }

  if (tsType.flags & ts.TypeFlags.NumberLike) {
    return { type: 'number' };
  }

  if (checker.isArrayType(tsType)) {
    return { type: 'array' };
  }

  // Object types (non-primitive)
  if (tsType.flags & ts.TypeFlags.Object) {
    return { type: 'object' };
  }

  return { type: 'unknown' };
}
