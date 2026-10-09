import ts from 'typescript';

/** The types Angular gives a signal input, which is all a declaration file still shows of one. */
const INPUT_SIGNAL_TYPES = new Set(['InputSignal', 'InputSignalWithTransform', 'ModelSignal']);

export interface UnreadableBase {
    classDecl: ts.ClassDeclaration;
    /** Signal inputs the base class declares, by name. */
    inputs: string[];
}

export interface ClassHierarchy {
    /** The class itself, then each base class with source, nearest first. */
    classes: ts.ClassDeclaration[];
    /**
     * Base classes that only exist as a declaration file, typically shipped by
     * an npm package, and declare signal inputs. Without the initializer there
     * is no `input()` call, required flag or default left to read.
     */
    unreadable: UnreadableBase[];
}

/**
 * Follow `extends` from a class up to the root of its hierarchy. A mixin
 * (`extends withX(Base)`) ends the walk: what the call returns has no class
 * declaration to read members from.
 */
export function getClassHierarchy(classDecl: ts.ClassDeclaration, checker: ts.TypeChecker): ClassHierarchy {
    const classes: ts.ClassDeclaration[] = [];
    const unreadable: UnreadableBase[] = [];
    const visited = new Set<ts.ClassDeclaration>();

    for (let current: ts.ClassDeclaration | undefined = classDecl; current && !visited.has(current); current = getBaseClass(current, checker)) {
        visited.add(current);

        if (!current.getSourceFile().isDeclarationFile) {
            classes.push(current);
            continue;
        }

        const inputs = getDeclaredSignalInputs(current);

        if (inputs.length > 0) unreadable.push({ classDecl: current, inputs });
    }

    return { classes, unreadable };
}

function getBaseClass(classDecl: ts.ClassDeclaration, checker: ts.TypeChecker): ts.ClassDeclaration | undefined {
    const clause = classDecl.heritageClauses?.find((c) => c.token === ts.SyntaxKind.ExtendsKeyword);
    const expression = clause?.types[0]?.expression;

    if (!expression || !(ts.isIdentifier(expression) || ts.isPropertyAccessExpression(expression))) return undefined;

    let symbol = checker.getSymbolAtLocation(expression);

    if (symbol && symbol.flags & ts.SymbolFlags.Alias) symbol = checker.getAliasedSymbol(symbol);

    return symbol?.declarations?.find(ts.isClassDeclaration);
}

function getDeclaredSignalInputs(classDecl: ts.ClassDeclaration): string[] {
    const inputs: string[] = [];

    for (const member of classDecl.members) {
        if (!ts.isPropertyDeclaration(member) || !ts.isIdentifier(member.name)) continue;
        if (!member.type || !ts.isTypeReferenceNode(member.type)) continue;

        const typeName = ts.isQualifiedName(member.type.typeName) ? member.type.typeName.right : member.type.typeName;

        if (INPUT_SIGNAL_TYPES.has(typeName.text)) inputs.push(member.name.text);
    }

    return inputs;
}
