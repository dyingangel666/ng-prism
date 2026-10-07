import ts from 'typescript';

/**
 * What {@link evaluateStatic} returns for a root it cannot evaluate. A symbol,
 * so that it stays distinct from an `undefined` written on purpose.
 */
export const UNEVALUABLE: unique symbol = Symbol('ng-prism.unevaluable');

export type EvaluationPath = ReadonlyArray<string | number>;

export interface UnevaluableIssue {
    /** Where the dropped part sat in the evaluated value, with array indices as written in the source. */
    path: EvaluationPath;
    /** The expression, spread or property that could not be evaluated. */
    node: ts.Node;
    /** `runtime-value` marks functions, classes and instances, which no static evaluation can ever capture. */
    reason: 'unsupported' | 'runtime-value';
}

export type UnevaluableReporter = (issue: UnevaluableIssue) => void;

const ignore: UnevaluableReporter = () => undefined;

const ARITHMETIC: Partial<Record<ts.SyntaxKind, (left: number, right: number) => number>> = {
    [ts.SyntaxKind.PlusToken]: (left, right) => left + right,
    [ts.SyntaxKind.MinusToken]: (left, right) => left - right,
    [ts.SyntaxKind.AsteriskToken]: (left, right) => left * right,
    [ts.SyntaxKind.SlashToken]: (left, right) => left / right,
    [ts.SyntaxKind.PercentToken]: (left, right) => left % right,
    [ts.SyntaxKind.AsteriskAsteriskToken]: (left, right) => left ** right
};

/**
 * Statically evaluate an AST expression node.
 *
 * Inside an object or array literal, whatever cannot be evaluated costs only
 * that property or element: it is reported and left out, never the container
 * around it. Only the root itself can come back as {@link UNEVALUABLE}.
 */
export function evaluateStatic(node: ts.Expression, report: UnevaluableReporter = ignore): unknown {
    return evaluateMember(node, [], report);
}

/**
 * {@link evaluateStatic} for callers that read a few known fields and have no
 * use for diagnostics, such as `@Component` metadata: what cannot be evaluated
 * is left out silently, and an unevaluable root becomes `undefined`.
 */
export function evaluateExpression(node: ts.Expression): unknown {
    const value = evaluateStatic(node);

    return value === UNEVALUABLE ? undefined : value;
}

function evaluateMember(node: ts.Expression, path: EvaluationPath, report: UnevaluableReporter): unknown {
    const value = evaluateNode(node, path, report);

    if (value === UNEVALUABLE) {
        report({ path, node, reason: isRuntimeValue(node) ? 'runtime-value' : 'unsupported' });
    }
    return value;
}

/**
 * Reports only what an array or object literal drops. An operand that fails
 * makes the whole expression around it {@link UNEVALUABLE}, so the member
 * holding it reports `limit * 2`, not just `limit`.
 */
function evaluateNode(node: ts.Expression, path: EvaluationPath, report: UnevaluableReporter): unknown {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
        return node.text;
    }

    if (ts.isNumericLiteral(node)) {
        return finite(Number(node.text));
    }

    if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
    if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
    if (node.kind === ts.SyntaxKind.NullKeyword) return null;
    // In expression position `undefined` parses as an identifier, not a keyword.
    if (ts.isIdentifier(node) && node.text === 'undefined') return undefined;

    // Types only: the value is the expression inside.
    if (
        ts.isParenthesizedExpression(node) ||
        ts.isAsExpression(node) ||
        ts.isSatisfiesExpression(node) ||
        ts.isNonNullExpression(node) ||
        ts.isTypeAssertionExpression(node)
    ) {
        return evaluateNode(node.expression, path, report);
    }

    if (ts.isPrefixUnaryExpression(node)) {
        return evaluatePrefixUnary(node);
    }

    if (ts.isBinaryExpression(node)) {
        return evaluateBinary(node);
    }

    if (ts.isTemplateExpression(node)) {
        return evaluateTemplate(node);
    }

    if (ts.isArrayLiteralExpression(node)) {
        return evaluateArray(node, path, report);
    }

    if (ts.isObjectLiteralExpression(node)) {
        return evaluateObject(node, path, report);
    }

    return UNEVALUABLE;
}

function evaluatePrefixUnary(node: ts.PrefixUnaryExpression): unknown {
    const operand = evaluateNode(node.operand, [], ignore);

    switch (node.operator) {
        case ts.SyntaxKind.MinusToken:
            return typeof operand === 'number' ? -operand : UNEVALUABLE;
        case ts.SyntaxKind.PlusToken:
            return typeof operand === 'number' ? operand : UNEVALUABLE;
        case ts.SyntaxKind.ExclamationToken:
            return operand === UNEVALUABLE ? UNEVALUABLE : !operand;
        default:
            return UNEVALUABLE;
    }
}

/**
 * Arithmetic on numbers, and `+` as concatenation once either side is a
 * string. Anything JavaScript would coerce beyond that, such as an object to
 * `[object Object]`, is not what anybody meant to put into a showcase.
 */
function evaluateBinary(node: ts.BinaryExpression): unknown {
    const operator = node.operatorToken.kind;
    const left = evaluateNode(node.left, [], ignore);
    const right = evaluateNode(node.right, [], ignore);

    if (operator === ts.SyntaxKind.PlusToken && (typeof left === 'string' || typeof right === 'string')) {
        return isPrimitive(left) && isPrimitive(right) ? String(left) + String(right) : UNEVALUABLE;
    }

    const apply = ARITHMETIC[operator];

    return apply && typeof left === 'number' && typeof right === 'number' ? finite(apply(left, right)) : UNEVALUABLE;
}

function evaluateTemplate(node: ts.TemplateExpression): unknown {
    let text = node.head.text;

    for (const span of node.templateSpans) {
        const value = evaluateNode(span.expression, [], ignore);

        if (!isPrimitive(value)) return UNEVALUABLE;
        text += String(value) + span.literal.text;
    }
    return text;
}

function isPrimitive(value: unknown): value is string | number | boolean | null | undefined {
    return value === null || value === undefined || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
}

/** `Infinity` and `NaN` would reach the manifest as `null`. */
function finite(value: number): number | typeof UNEVALUABLE {
    return Number.isFinite(value) ? value : UNEVALUABLE;
}

function evaluateArray(node: ts.ArrayLiteralExpression, path: EvaluationPath, report: UnevaluableReporter): unknown[] {
    const result: unknown[] = [];

    node.elements.forEach((element, index) => {
        const elementPath = [...path, index];

        if (ts.isSpreadElement(element)) {
            report({ path: elementPath, node: element, reason: 'unsupported' });
            return;
        }

        const value = evaluateMember(element, elementPath, report);

        if (value !== UNEVALUABLE) result.push(value);
    });
    return result;
}

function evaluateObject(node: ts.ObjectLiteralExpression, path: EvaluationPath, report: UnevaluableReporter): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const prop of node.properties) {
        if (ts.isSpreadAssignment(prop)) {
            report({ path, node: prop, reason: 'unsupported' });
            continue;
        }

        if (ts.isShorthandPropertyAssignment(prop)) {
            report({ path: [...path, prop.name.text], node: prop, reason: 'unsupported' });
            continue;
        }

        const key = propertyKey(prop.name);

        if (key === undefined) {
            report({ path, node: prop, reason: 'unsupported' });
            continue;
        }

        if (!ts.isPropertyAssignment(prop)) {
            // Methods and accessors: functions, whatever their syntax.
            report({ path: [...path, key], node: prop, reason: 'runtime-value' });
            continue;
        }

        const value = evaluateMember(prop.initializer, [...path, key], report);

        if (value !== UNEVALUABLE) result[key] = value;
    }
    return result;
}

function propertyKey(name: ts.PropertyName): string | undefined {
    if (ts.isIdentifier(name) || ts.isStringLiteral(name)) {
        return name.text;
    }

    if (ts.isNumericLiteral(name)) {
        return String(Number(name.text));
    }

    if (ts.isComputedPropertyName(name)) {
        const key = evaluateNode(name.expression, [], ignore);

        return typeof key === 'string' || typeof key === 'number' ? String(key) : undefined;
    }
    return undefined;
}

function isRuntimeValue(node: ts.Expression): boolean {
    if (ts.isParenthesizedExpression(node)) return isRuntimeValue(node.expression);

    return ts.isArrowFunction(node) || ts.isFunctionExpression(node) || ts.isClassExpression(node) || ts.isNewExpression(node);
}

/**
 * Find a decorator by name on a class or property declaration.
 */
export function findDecorator(node: ts.ClassDeclaration | ts.PropertyDeclaration, name: string): ts.Decorator | undefined {
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
    const symbol = checker.getSymbolAtLocation(ts.isClassDeclaration(node) || ts.isPropertyDeclaration(node) ? (node.name ?? node) : node);

    if (!symbol) return undefined;

    const doc = ts.displayPartsToString(symbol.getDocumentationComment(checker)).trim();

    return doc || undefined;
}
