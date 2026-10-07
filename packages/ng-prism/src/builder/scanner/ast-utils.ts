import ts from 'typescript';

/**
 * What {@link evaluateStatic} returns for a root it cannot evaluate. A symbol,
 * so that it stays distinct from an `undefined` written on purpose.
 */
export const UNEVALUABLE: unique symbol = Symbol('ng-prism.unevaluable');

export type EvaluationPath = ReadonlyArray<string | number>;

/** A reference in the source whose declaration has no value the evaluator can use. */
export interface UnresolvedReference {
    /** The identifier, shorthand property or property access that did not resolve. */
    node: ts.Node;
    /**
     * `let` and `var` are not constants. `no-value` is a declaration without an
     * initializer, as with `declare const` or in the `.d.ts` of a compiled
     * package. `cycle` is a constant that refers back to itself, and
     * `runtime-value` a function or class.
     */
    kind: 'let' | 'var' | 'no-value' | 'cycle' | 'runtime-value';
}

export interface UnevaluableIssue {
    /** Where the dropped part sat in the evaluated value, with array indices as written in the source. */
    path: EvaluationPath;
    /** The expression, spread or property that could not be evaluated. */
    node: ts.Node;
    /** `runtime-value` marks functions, classes and instances, which no static evaluation can ever capture. */
    reason: 'unsupported' | 'runtime-value';
    /** The innermost reference that failed, when one is what made `node` unevaluable. */
    cause?: UnresolvedReference;
}

export type UnevaluableReporter = (issue: UnevaluableIssue) => void;

export interface EvaluateOptions {
    /** Called for every property, element or spread that is dropped. */
    report?: UnevaluableReporter;
    /** Resolves constants, enum members and imports. Without it, every reference is unevaluable. */
    checker?: ts.TypeChecker;
}

interface Context {
    readonly report: UnevaluableReporter;
    readonly checker: ts.TypeChecker | undefined;
    /** Declarations being evaluated right now, to stop at a constant that refers back to itself. */
    readonly resolving: Set<ts.VariableDeclaration>;
    /** Shared with {@link silent} copies, so that a failing operand can still name its cause. */
    readonly trace: { cause?: UnresolvedReference };
}

const ignore: UnevaluableReporter = () => undefined;

const ARITHMETIC: Partial<Record<ts.SyntaxKind, (left: number, right: number) => number>> = {
    [ts.SyntaxKind.PlusToken]: (left, right) => left + right,
    [ts.SyntaxKind.MinusToken]: (left, right) => left - right,
    [ts.SyntaxKind.AsteriskToken]: (left, right) => left * right,
    [ts.SyntaxKind.SlashToken]: (left, right) => left / right,
    [ts.SyntaxKind.PercentToken]: (left, right) => left % right,
    [ts.SyntaxKind.AsteriskAsteriskToken]: (left, right) => left ** right
};

/** Symbols that name a declaration of their own, as opposed to a property inside a constant's value. */
const DECLARATION_SYMBOLS = ts.SymbolFlags.Variable | ts.SymbolFlags.EnumMember | ts.SymbolFlags.Function | ts.SymbolFlags.Class | ts.SymbolFlags.Method;

/**
 * Statically evaluate an AST expression node.
 *
 * Inside an object or array literal, whatever cannot be evaluated costs only
 * that property or element: it is reported and left out, never the container
 * around it. Only the root itself can come back as {@link UNEVALUABLE}.
 */
export function evaluateStatic(node: ts.Expression, options: EvaluateOptions = {}): unknown {
    return evaluateMember(node, [], { report: options.report ?? ignore, checker: options.checker, resolving: new Set(), trace: {} });
}

/**
 * {@link evaluateStatic} for callers that read a few known fields and have no
 * use for diagnostics, such as `@Component` metadata: what cannot be evaluated
 * is left out silently, and an unevaluable root becomes `undefined`.
 */
export function evaluateExpression(node: ts.Expression, checker?: ts.TypeChecker): unknown {
    const value = evaluateStatic(node, { checker });

    return value === UNEVALUABLE ? undefined : value;
}

function evaluateMember(node: ts.Expression, path: EvaluationPath, context: Context): unknown {
    return guard(node, path, context, () => evaluateNode(node, path, context));
}

/** Runs `evaluate` for the member `node` and, if it fails, reports it with the cause the trace picked up on the way. */
function guard(node: ts.Node, path: EvaluationPath, context: Context, evaluate: () => unknown): unknown {
    const { trace } = context;
    const outer = trace.cause;

    trace.cause = undefined;
    const value = evaluate();

    if (value === UNEVALUABLE) {
        context.report({ path, node, reason: isRuntimeValue(node) ? 'runtime-value' : 'unsupported', cause: trace.cause });
    }
    trace.cause = outer;
    return value;
}

/** For operands and keys: what fails inside them is the failure of the member around them, not a drop of its own. */
function silent(context: Context): Context {
    return { ...context, report: ignore };
}

/**
 * Reports only what an array or object literal drops. An operand that fails
 * makes the whole expression around it {@link UNEVALUABLE}, so the member
 * holding it reports `limit * 2`, not just `limit`.
 */
function evaluateNode(node: ts.Expression, path: EvaluationPath, context: Context): unknown {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
        return node.text;
    }

    if (ts.isNumericLiteral(node)) {
        return finite(Number(node.text));
    }

    if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
    if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
    if (node.kind === ts.SyntaxKind.NullKeyword) return null;

    if (ts.isIdentifier(node)) {
        // In expression position `undefined` parses as an identifier, not a keyword.
        if (node.text === 'undefined') return undefined;
        return evaluateReference(context.checker?.getSymbolAtLocation(node), node, path, context);
    }

    // Types only: the value is the expression inside.
    if (
        ts.isParenthesizedExpression(node) ||
        ts.isAsExpression(node) ||
        ts.isSatisfiesExpression(node) ||
        ts.isNonNullExpression(node) ||
        ts.isTypeAssertionExpression(node)
    ) {
        return evaluateNode(node.expression, path, context);
    }

    if (ts.isPrefixUnaryExpression(node)) {
        return evaluatePrefixUnary(node, context);
    }

    if (ts.isBinaryExpression(node)) {
        return evaluateBinary(node, context);
    }

    if (ts.isTemplateExpression(node)) {
        return evaluateTemplate(node, context);
    }

    if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) {
        return evaluateAccess(node, path, context);
    }

    if (ts.isArrayLiteralExpression(node)) {
        return evaluateArray(node, path, context);
    }

    if (ts.isObjectLiteralExpression(node)) {
        return evaluateObject(node, path, context);
    }

    return UNEVALUABLE;
}

/**
 * The value of the declaration a reference points to: the initializer of a
 * `const`, or the value of an enum member. Imports are followed to their
 * source, and what the initializer drops is reported where it is written.
 */
function evaluateReference(symbol: ts.Symbol | undefined, reference: ts.Node, path: EvaluationPath, context: Context): unknown {
    const { checker } = context;

    if (!symbol || !checker) return UNEVALUABLE;

    const target = resolveAlias(symbol, checker);
    const declaration = target.valueDeclaration;

    if (target.flags & (ts.SymbolFlags.Function | ts.SymbolFlags.Class | ts.SymbolFlags.Method)) {
        return fail(reference, 'runtime-value', context);
    }

    if (declaration && ts.isEnumMember(declaration)) {
        // Asked of the member, not of `Size.Medium`: for an access the checker only answers for const enums.
        return checker.getConstantValue(declaration) ?? UNEVALUABLE;
    }

    if (!declaration || !ts.isVariableDeclaration(declaration) || !ts.isIdentifier(declaration.name)) return UNEVALUABLE;

    const scope = ts.getCombinedNodeFlags(declaration) & ts.NodeFlags.BlockScoped;

    if (scope === ts.NodeFlags.Let) return fail(reference, 'let', context);
    if (scope === 0) return fail(reference, 'var', context);
    if (scope !== ts.NodeFlags.Const) return UNEVALUABLE;
    if (!declaration.initializer) return fail(reference, 'no-value', context);
    if (context.resolving.has(declaration)) return fail(reference, 'cycle', context);

    context.resolving.add(declaration);
    try {
        return evaluateNode(declaration.initializer, path, context);
    } finally {
        context.resolving.delete(declaration);
    }
}

function resolveAlias(symbol: ts.Symbol, checker: ts.TypeChecker): ts.Symbol {
    return symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
}

function fail(reference: ts.Node, kind: UnresolvedReference['kind'], context: Context): typeof UNEVALUABLE {
    context.trace.cause ??= { node: reference, kind };
    return UNEVALUABLE;
}

/**
 * `tokens.MAX_FILES` and `Size.Medium` name a declaration of their own.
 * `TOKENS.size.m` and `SIZES[1]` read a property from a constant's value.
 */
function evaluateAccess(node: ts.PropertyAccessExpression | ts.ElementAccessExpression, path: EvaluationPath, context: Context): unknown {
    const { checker } = context;
    const symbol = checker?.getSymbolAtLocation(node);

    if (symbol && checker && resolveAlias(symbol, checker).flags & DECLARATION_SYMBOLS) {
        return evaluateReference(symbol, node, path, context);
    }

    const object = evaluateNode(node.expression, [], silent(context));
    const key = ts.isPropertyAccessExpression(node) ? node.name.text : evaluateNode(node.argumentExpression, [], silent(context));

    if (typeof object !== 'object' || object === null || (typeof key !== 'string' && typeof key !== 'number')) return UNEVALUABLE;

    return Object.hasOwn(object, key) ? (object as Record<string | number, unknown>)[key] : UNEVALUABLE;
}

function evaluatePrefixUnary(node: ts.PrefixUnaryExpression, context: Context): unknown {
    const operand = evaluateNode(node.operand, [], silent(context));

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
function evaluateBinary(node: ts.BinaryExpression, context: Context): unknown {
    const operator = node.operatorToken.kind;
    const left = evaluateNode(node.left, [], silent(context));
    const right = evaluateNode(node.right, [], silent(context));

    if (operator === ts.SyntaxKind.PlusToken && (typeof left === 'string' || typeof right === 'string')) {
        return isPrimitive(left) && isPrimitive(right) ? String(left) + String(right) : UNEVALUABLE;
    }

    const apply = ARITHMETIC[operator];

    return apply && typeof left === 'number' && typeof right === 'number' ? finite(apply(left, right)) : UNEVALUABLE;
}

function evaluateTemplate(node: ts.TemplateExpression, context: Context): unknown {
    let text = node.head.text;

    for (const span of node.templateSpans) {
        const value = evaluateNode(span.expression, [], silent(context));

        if (!isPrimitive(value)) return UNEVALUABLE;
        text += String(value) + span.literal.text;
    }
    return text;
}

function isPrimitive(value: unknown): value is string | number | boolean | null | undefined {
    return value === null || value === undefined || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** `Infinity` and `NaN` would reach the manifest as `null`. */
function finite(value: number): number | typeof UNEVALUABLE {
    return Number.isFinite(value) ? value : UNEVALUABLE;
}

function evaluateArray(node: ts.ArrayLiteralExpression, path: EvaluationPath, context: Context): unknown[] {
    const result: unknown[] = [];

    node.elements.forEach((element, index) => {
        const elementPath = [...path, index];

        if (ts.isSpreadElement(element)) {
            const spread = guard(element, elementPath, context, () => {
                const value = evaluateNode(element.expression, elementPath, context);

                return Array.isArray(value) ? value : UNEVALUABLE;
            });

            if (Array.isArray(spread)) result.push(...spread);
            return;
        }

        const value = evaluateMember(element, elementPath, context);

        if (value !== UNEVALUABLE) result.push(value);
    });
    return result;
}

function evaluateObject(node: ts.ObjectLiteralExpression, path: EvaluationPath, context: Context): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const prop of node.properties) {
        if (ts.isSpreadAssignment(prop)) {
            const spread = guard(prop, path, context, () => {
                const value = evaluateNode(prop.expression, path, context);

                return isRecord(value) ? value : UNEVALUABLE;
            });

            if (isRecord(spread)) Object.assign(result, spread);
            continue;
        }

        if (ts.isShorthandPropertyAssignment(prop)) {
            const keyPath = [...path, prop.name.text];
            const value = guard(prop, keyPath, context, () => evaluateReference(context.checker?.getShorthandAssignmentValueSymbol(prop), prop.name, keyPath, context));

            if (value !== UNEVALUABLE) result[prop.name.text] = value;
            continue;
        }

        const key = propertyKey(prop.name, context);

        if (key === undefined) {
            context.report({ path, node: prop, reason: 'unsupported' });
            continue;
        }

        if (!ts.isPropertyAssignment(prop)) {
            // Methods and accessors: functions, whatever their syntax.
            context.report({ path: [...path, key], node: prop, reason: 'runtime-value' });
            continue;
        }

        const value = evaluateMember(prop.initializer, [...path, key], context);

        if (value !== UNEVALUABLE) result[key] = value;
    }
    return result;
}

function propertyKey(name: ts.PropertyName, context: Context): string | undefined {
    if (ts.isIdentifier(name) || ts.isStringLiteral(name)) {
        return name.text;
    }

    if (ts.isNumericLiteral(name)) {
        return String(Number(name.text));
    }

    if (ts.isComputedPropertyName(name)) {
        const key = evaluateNode(name.expression, [], silent(context));

        return typeof key === 'string' || typeof key === 'number' ? String(key) : undefined;
    }
    return undefined;
}

function isRuntimeValue(node: ts.Node): boolean {
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
