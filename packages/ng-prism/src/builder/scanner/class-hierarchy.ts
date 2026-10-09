import ts from 'typescript';
import { findDecorator } from './ast-utils.js';

/** The types Angular gives a signal input, which is all a declaration written by hand shows of one. */
const INPUT_SIGNAL_TYPES = new Set(['InputSignal', 'InputSignalWithTransform', 'ModelSignal']);

/** The static fields the Angular compiler writes a class's directive definition into. */
const DEFINITION_FIELDS = new Set(['ɵdir', 'ɵcmp']);

export interface HierarchyClass {
    classDecl: ts.ClassDeclaration;
    /**
     * Whether Angular takes inputs and outputs from it: the class itself, or a
     * base class with @Directive() or @Component(). Angular passes over an
     * undecorated base class, although its fields are still initialized.
     */
    definesMetadata: boolean;
}

export interface UnreadableBase {
    classDecl: ts.ClassDeclaration;
    /** Public names of the inputs it declares. */
    inputs: string[];
}

export interface ClassHierarchy {
    /** The class itself, then each base class with source, nearest first. */
    classes: HierarchyClass[];
    /**
     * Base classes that only exist as a declaration and declare inputs:
     * typically a .d.ts shipped by an npm package, or a `declare class`.
     * Without the initializer there is no `input()` call, required flag or
     * default left to read.
     */
    unreadable: UnreadableBase[];
}

/**
 * Follow `extends` from a class up to the root of its hierarchy. A mixin
 * (`extends withX(Base)`) ends the walk: what the call returns has no class
 * declaration to read members from.
 */
export function getClassHierarchy(classDecl: ts.ClassDeclaration, checker: ts.TypeChecker): ClassHierarchy {
    const classes: HierarchyClass[] = [];
    const unreadable: UnreadableBase[] = [];
    const visited = new Set<ts.ClassDeclaration>();

    for (let current: ts.ClassDeclaration | undefined = classDecl; current && !visited.has(current); current = getBaseClass(current, checker)) {
        visited.add(current);

        if (!isDeclarationOnly(current)) {
            classes.push({ classDecl: current, definesMetadata: current === classDecl || isAngularClass(current) });
            continue;
        }

        const inputs = getDeclaredInputs(current);

        if (inputs.length > 0) unreadable.push({ classDecl: current, inputs });
    }

    return { classes, unreadable };
}

function isAngularClass(classDecl: ts.ClassDeclaration): boolean {
    return !!(findDecorator(classDecl, 'Directive') ?? findDecorator(classDecl, 'Component'));
}

function getBaseClass(classDecl: ts.ClassDeclaration, checker: ts.TypeChecker): ts.ClassDeclaration | undefined {
    const clause = classDecl.heritageClauses?.find((c) => c.token === ts.SyntaxKind.ExtendsKeyword);
    let expression: ts.Expression | undefined = clause?.types[0]?.expression;

    while (expression && ts.isParenthesizedExpression(expression)) expression = expression.expression;

    if (!expression || !(ts.isIdentifier(expression) || ts.isPropertyAccessExpression(expression))) return undefined;

    let symbol = checker.getSymbolAtLocation(expression);

    if (symbol && symbol.flags & ts.SymbolFlags.Alias) symbol = checker.getAliasedSymbol(symbol);

    return symbol?.declarations?.find(ts.isClassDeclaration);
}

/** A class in a .d.ts, a `declare class`, or one inside `declare module` or `declare namespace`. */
function isDeclarationOnly(classDecl: ts.ClassDeclaration): boolean {
    if (classDecl.getSourceFile().isDeclarationFile) return true;

    for (let node: ts.Node = classDecl; !ts.isSourceFile(node); node = node.parent) {
        if ((ts.isClassDeclaration(node) || ts.isModuleDeclaration(node)) && ts.getModifiers(node)?.some((m) => m.kind === ts.SyntaxKind.DeclareKeyword)) {
            return true;
        }
    }

    return false;
}

/**
 * The input map the Angular compiler writes into `ɵdir`/`ɵcmp` is complete,
 * decorator inputs and aliases included. A declaration written by hand has
 * none, so the signal types are all there is to go by.
 */
function getDeclaredInputs(classDecl: ts.ClassDeclaration): string[] {
    const definition = classDecl.members.find(
        (member): member is ts.PropertyDeclaration => ts.isPropertyDeclaration(member) && DEFINITION_FIELDS.has(getPropertyNameText(member.name) ?? '')
    );

    if (definition) {
        const inputMap = definition.type && ts.isTypeReferenceNode(definition.type) ? definition.type.typeArguments?.[3] : undefined;

        return inputMap && ts.isTypeLiteralNode(inputMap) ? inputMap.members.flatMap((entry) => getPublicInputName(entry) ?? []) : [];
    }

    return classDecl.members.flatMap((member) => {
        if (!ts.isPropertyDeclaration(member) || !member.type || !ts.isTypeReferenceNode(member.type)) return [];

        const typeName = ts.isQualifiedName(member.type.typeName) ? member.type.typeName.right : member.type.typeName;
        const name = getPropertyNameText(member.name);

        return name && INPUT_SIGNAL_TYPES.has(typeName.text) ? [name] : [];
    });
}

/** `{ alias: 'x'; required: … }` since Angular 16, a plain `'x'` before; a `null` alias means the property name. */
function getPublicInputName(entry: ts.TypeElement): string | undefined {
    if (!ts.isPropertySignature(entry)) return undefined;

    const alias = entry.type && ts.isTypeLiteralNode(entry.type) ? entry.type.members.find((m) => getPropertyNameText(m.name) === 'alias') : undefined;
    const aliasType = alias && ts.isPropertySignature(alias) ? alias.type : entry.type;

    if (aliasType && ts.isLiteralTypeNode(aliasType) && ts.isStringLiteral(aliasType.literal)) return aliasType.literal.text;

    return getPropertyNameText(entry.name);
}

function getPropertyNameText(name: ts.PropertyName | undefined): string | undefined {
    return name && (ts.isIdentifier(name) || ts.isStringLiteral(name)) ? name.text : undefined;
}
