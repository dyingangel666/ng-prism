import { relative } from 'node:path';
import ts from 'typescript';
import { evaluateExpression, type EvaluationPath, type UnevaluableIssue } from './ast-utils.js';

const MAX_EXCERPT_LENGTH = 60;
const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

/**
 * Describe one value the scanner had to drop from a `@Showcase` config:
 * which component, where in the config, what the source said and where.
 *
 * `SguiFileInputComponent › variants[3] "Auto hint" › inputs.maxFileSize — "megabytes(5)" (src/file-input.component.ts:27:22) cannot be evaluated statically and was dropped.`
 */
export function describeUnevaluable(className: string, config: ts.Expression, issue: UnevaluableIssue): string {
    const isRoot = issue.node === config;
    const where = issue.path.length === 0 ? '@Showcase' : formatShowcasePath(issue.path, config);
    const consequence = isRoot
        ? 'cannot be evaluated statically, so the component is skipped'
        : issue.reason === 'runtime-value'
          ? 'is a runtime value (function, class or instance) and cannot be part of the static manifest; it was dropped'
          : 'cannot be evaluated statically and was dropped';

    return `${className} › ${where} — "${excerpt(issue.node)}" (${location(issue.node)}) ${consequence}.`;
}

/** A variant is named by its `name` as well as its index, since that is what the styleguide shows. */
function formatShowcasePath(path: EvaluationPath, config: ts.Expression): string {
    const [head, index, ...rest] = path;

    if (head !== 'variants' || typeof index !== 'number') return formatPath(path);

    const name = variantName(config, index);
    const variant = name === undefined ? `variants[${index}]` : `variants[${index}] ${JSON.stringify(name)}`;

    return rest.length === 0 ? variant : `${variant} › ${formatPath(rest)}`;
}

function formatPath(path: EvaluationPath): string {
    return path
        .map((segment, i) => {
            if (typeof segment === 'number') return `[${segment}]`;
            if (!IDENTIFIER.test(segment)) return `[${JSON.stringify(segment)}]`;
            return i === 0 ? segment : `.${segment}`;
        })
        .join('');
}

/** Read from the source, because the evaluated array has already lost the elements before the index. */
function variantName(config: ts.Expression, index: number): string | undefined {
    const variants = ts.isObjectLiteralExpression(config) ? findProperty(config, 'variants') : undefined;
    const variant = variants && ts.isArrayLiteralExpression(variants) ? variants.elements[index] : undefined;
    const name = variant && ts.isObjectLiteralExpression(variant) ? findProperty(variant, 'name') : undefined;
    const value = name && evaluateExpression(name);

    return typeof value === 'string' ? value : undefined;
}

function findProperty(object: ts.ObjectLiteralExpression, key: string): ts.Expression | undefined {
    for (const prop of object.properties) {
        if (ts.isPropertyAssignment(prop) && (ts.isIdentifier(prop.name) || ts.isStringLiteral(prop.name)) && prop.name.text === key) {
            return prop.initializer;
        }
    }
    return undefined;
}

function excerpt(node: ts.Node): string {
    const text = node.getText().replace(/\s+/g, ' ');

    return text.length > MAX_EXCERPT_LENGTH ? `${text.slice(0, MAX_EXCERPT_LENGTH - 1)}…` : text;
}

/** Relative to the working directory and with line and column, so that terminals and editors can link it. */
function location(node: ts.Node): string {
    const sourceFile = node.getSourceFile();
    const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());

    return `${relative(process.cwd(), sourceFile.fileName)}:${line + 1}:${character + 1}`;
}
