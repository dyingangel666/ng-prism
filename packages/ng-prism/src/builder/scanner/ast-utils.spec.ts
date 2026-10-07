import ts from 'typescript';
import { evaluateExpression, evaluateStatic, findDecorator, getDecoratorArgument, getJsDocComment, UNEVALUABLE, type UnevaluableIssue } from './ast-utils.js';

// --- Helpers ---

function parseExpression(code: string): ts.Expression {
    const sourceFile = ts.createSourceFile('test.ts', code, ts.ScriptTarget.Latest, true);
    const stmt = sourceFile.statements[0] as ts.ExpressionStatement;

    return stmt.expression;
}

function createProgramFromSource(source: string) {
    const fileName = '/test.ts';
    const host = ts.createCompilerHost({});
    const originalGetSourceFile = host.getSourceFile;

    host.getSourceFile = (name, target, onError) => {
        if (name === fileName) {
            return ts.createSourceFile(name, source, target, true);
        }
        return originalGetSourceFile.call(host, name, target, onError);
    };
    host.fileExists = (name) => name === fileName || ts.sys.fileExists(name);
    host.readFile = (name) => (name === fileName ? source : ts.sys.readFile(name));

    const program = ts.createProgram([fileName], { target: ts.ScriptTarget.Latest }, host);
    const checker = program.getTypeChecker();
    const sourceFile = program.getSourceFile(fileName)!;

    return { program, checker, sourceFile };
}

function evaluateWithIssues(code: string) {
    const issues: UnevaluableIssue[] = [];
    const value = evaluateStatic(parseExpression(code), (issue) => issues.push(issue));

    return {
        value,
        issues: issues.map((issue) => ({ path: issue.path, text: issue.node.getText(), reason: issue.reason }))
    };
}

// --- evaluateExpression ---

describe('evaluateExpression', () => {
    it('should evaluate string literals', () => {
        expect(evaluateExpression(parseExpression("'hello'"))).toBe('hello');
        expect(evaluateExpression(parseExpression('"world"'))).toBe('world');
    });

    it('should evaluate template literals without substitutions', () => {
        expect(evaluateExpression(parseExpression('`template`'))).toBe('template');
    });

    it('should evaluate numeric literals', () => {
        expect(evaluateExpression(parseExpression('42'))).toBe(42);
        expect(evaluateExpression(parseExpression('3.14'))).toBe(3.14);
    });

    it('should evaluate negative numbers', () => {
        expect(evaluateExpression(parseExpression('-1'))).toBe(-1);
        expect(evaluateExpression(parseExpression('-99.5'))).toBe(-99.5);
    });

    it('should evaluate boolean literals', () => {
        expect(evaluateExpression(parseExpression('true'))).toBe(true);
        expect(evaluateExpression(parseExpression('false'))).toBe(false);
    });

    it('should evaluate null', () => {
        expect(evaluateExpression(parseExpression('null'))).toBeNull();
    });

    it('should return undefined for undefined keyword', () => {
        expect(evaluateExpression(parseExpression('undefined'))).toBeUndefined();
    });

    it('should evaluate array literals', () => {
        expect(evaluateExpression(parseExpression("['a', 'b', 'c']"))).toEqual(['a', 'b', 'c']);
        expect(evaluateExpression(parseExpression('[1, 2, 3]'))).toEqual([1, 2, 3]);
    });

    it('should evaluate object literals', () => {
        expect(evaluateExpression(parseExpression("({ name: 'test', value: 42 })"))).toEqual({
            name: 'test',
            value: 42
        });
    });

    it('should evaluate nested structures', () => {
        const result = evaluateExpression(parseExpression("({ items: ['a', 'b'], nested: { x: 1 } })"));

        expect(result).toEqual({ items: ['a', 'b'], nested: { x: 1 } });
    });

    it('should return undefined for variable references', () => {
        expect(evaluateExpression(parseExpression('someVar'))).toBeUndefined();
    });

    it('should return undefined for function calls', () => {
        expect(evaluateExpression(parseExpression('fn()'))).toBeUndefined();
    });

    it('should drop only the spread from an array', () => {
        expect(evaluateExpression(parseExpression("['a', ...items]"))).toEqual(['a']);
    });

    it('should drop only the spread from an object', () => {
        expect(evaluateExpression(parseExpression("({ ...base, selector: 'x' })"))).toEqual({ selector: 'x' });
    });

    it('should evaluate objects with keyword property names', () => {
        const result = evaluateExpression(parseExpression("({ import: { name: 'Foo', from: 'bar' }, default: 'baz' })"));

        expect(result).toEqual({ import: { name: 'Foo', from: 'bar' }, default: 'baz' });
    });
});

describe('evaluateStatic', () => {
    it('keeps the siblings of a property it cannot evaluate', () => {
        expect(evaluateWithIssues('({ a: 1, b: compute() })')).toEqual({
            value: { a: 1 },
            issues: [{ path: ['b'], text: 'compute()', reason: 'unsupported' }]
        });
    });

    it('drops a spread, not the object around it', () => {
        expect(evaluateWithIssues('({ ...base, a: 1 })')).toEqual({
            value: { a: 1 },
            issues: [{ path: [], text: '...base', reason: 'unsupported' }]
        });
    });

    it('drops a shorthand property under its own name', () => {
        expect(evaluateWithIssues('({ label, a: 1 })')).toEqual({
            value: { a: 1 },
            issues: [{ path: ['label'], text: 'label', reason: 'unsupported' }]
        });
    });

    it('drops a property whose computed key it cannot evaluate', () => {
        expect(evaluateWithIssues('({ [key]: 1, a: 2 })')).toEqual({
            value: { a: 2 },
            issues: [{ path: [], text: '[key]: 1', reason: 'unsupported' }]
        });
    });

    it('evaluates literal computed keys and numeric keys', () => {
        expect(evaluateWithIssues("({ ['aria-label']: 'x', 1: 'one' })")).toEqual({
            value: { 'aria-label': 'x', '1': 'one' },
            issues: []
        });
    });

    it('drops an array element and reports its index in the source', () => {
        expect(evaluateWithIssues("['a', compute(), 'b']")).toEqual({
            value: ['a', 'b'],
            issues: [{ path: [1], text: 'compute()', reason: 'unsupported' }]
        });
    });

    it('drops an array spread', () => {
        expect(evaluateWithIssues("[...items, 'x']")).toEqual({
            value: ['x'],
            issues: [{ path: [0], text: '...items', reason: 'unsupported' }]
        });
    });

    it('reports the full path of a nested value', () => {
        const { value, issues } = evaluateWithIssues("({ variants: [{ name: 'A' }, { name: 'B', inputs: { size: compute() } }] })");

        expect(value).toEqual({ variants: [{ name: 'A' }, { name: 'B', inputs: {} }] });
        expect(issues).toEqual([{ path: ['variants', 1, 'inputs', 'size'], text: 'compute()', reason: 'unsupported' }]);
    });

    it('reports the whole member expression, not the part inside it that failed', () => {
        expect(evaluateWithIssues('({ a: -limit })').issues).toEqual([{ path: ['a'], text: '-limit', reason: 'unsupported' }]);
    });

    it('returns UNEVALUABLE for a root it cannot evaluate', () => {
        expect(evaluateWithIssues('config')).toEqual({
            value: UNEVALUABLE,
            issues: [{ path: [], text: 'config', reason: 'unsupported' }]
        });
    });

    it('treats a deliberate undefined as a value, not as a loss', () => {
        expect(evaluateWithIssues('undefined')).toEqual({ value: undefined, issues: [] });
        expect(evaluateWithIssues('({ a: undefined })').issues).toEqual([]);
    });

    it.each([
        ['multiplication', '5 * 1024 * 1024', 5242880],
        ['addition', '1 + 2', 3],
        ['subtraction', '10 - 4', 6],
        ['division', '9 / 2', 4.5],
        ['a remainder', '9 % 4', 1],
        ['exponentiation', '2 ** 10', 1024],
        ['precedence and parentheses', '(1 + 2) * 3', 9],
        ['a negated calculation', '-(2 * 3)', -6],
        ['unary plus', '+5', 5],
        ['logical not', '!false', true],
        ['string concatenation', "'ab' + 'cd'", 'abcd'],
        ['a number joined to a string', "'v' + 2", 'v2'],
        ['a boolean joined to a string', "'disabled: ' + true", 'disabled: true'],
        ['a template literal with placeholders', '`${2 * 3} files, ${"pdf"} only`', '6 files, pdf only'],
        ['as const', "['pdf', 'png'] as const", ['pdf', 'png']],
        ['an as assertion', "'m' as Size", 'm'],
        ['satisfies', '({ a: 1 } satisfies Config)', { a: 1 }],
        ['a non-null assertion', "'x'!", 'x'],
        ['an angle-bracket assertion', '<number>5', 5],
        ['numeric separators', '1_000_000', 1000000],
        ['a hexadecimal literal', '0x10', 16]
    ])('evaluates %s', (_, code, expected) => {
        expect(evaluateWithIssues(code)).toEqual({ value: expected, issues: [] });
    });

    it.each([
        ['an operand it cannot evaluate', 'limit * 2'],
        ['a placeholder it cannot evaluate', '`${count} files`'],
        ['an array in a placeholder', '`${[1, 2]}`'],
        ['arithmetic on a string', "'a' * 2"],
        ['addition of an object', "'a' + {}"],
        ['division by zero', '1 / 0'],
        ['a result that is not a number', '0 / 0'],
        ['a comparison', '1 === 1'],
        ['a logical operator', "'' || 'fallback'"],
        ['unary plus on a string', "+'5'"]
    ])('does not evaluate %s', (_, code) => {
        expect(evaluateWithIssues(`({ a: ${code} })`)).toEqual({
            value: {},
            issues: [{ path: ['a'], text: code, reason: 'unsupported' }]
        });
    });

    it.each([
        ['an arrow function', '({ a: () => 1 })'],
        ['a function expression', '({ a: function () { return 1; } })'],
        ['a class expression', '({ a: class {} })'],
        ['an instance', '({ a: new Date() })'],
        ['a method', '({ a() { return 1; } })'],
        ['an accessor', '({ get a() { return 1; } })']
    ])('marks %s as a runtime value', (_, code) => {
        const { value, issues } = evaluateWithIssues(code);

        expect(value).toEqual({});
        expect(issues).toEqual([expect.objectContaining({ path: ['a'], reason: 'runtime-value' })]);
    });
});

// --- findDecorator ---

describe('findDecorator', () => {
    it('should find a decorator by name', () => {
        const source = `
      function Showcase(config: any): ClassDecorator { return () => {}; }
      function Component(config: any): ClassDecorator { return () => {}; }
      @Showcase({ title: 'Test' })
      @Component({ selector: 'my-comp' })
      class MyComponent {}
    `;
        const { sourceFile } = createProgramFromSource(source);
        const classDecl = sourceFile.statements.find(ts.isClassDeclaration)!;

        const showcase = findDecorator(classDecl, 'Showcase');

        expect(showcase).toBeDefined();

        const component = findDecorator(classDecl, 'Component');

        expect(component).toBeDefined();

        const missing = findDecorator(classDecl, 'Injectable');

        expect(missing).toBeUndefined();
    });

    it('should find decorators without arguments', () => {
        const source = `
      function MyDeco(): ClassDecorator { return () => {}; }
      @MyDeco
      class MyClass {}
    `;
        const { sourceFile } = createProgramFromSource(source);
        const classDecl = sourceFile.statements.find(ts.isClassDeclaration)!;

        // Note: @MyDeco without () is an identifier, not a call
        const deco = findDecorator(classDecl, 'MyDeco');

        expect(deco).toBeDefined();
    });
});

// --- getDecoratorArgument ---

describe('getDecoratorArgument', () => {
    it('should extract the first argument from a decorator call', () => {
        const source = `
      function Showcase(config: any): ClassDecorator { return () => {}; }
      @Showcase({ title: 'Button' })
      class MyComponent {}
    `;
        const { sourceFile } = createProgramFromSource(source);
        const classDecl = sourceFile.statements.find(ts.isClassDeclaration)!;
        const decorator = findDecorator(classDecl, 'Showcase')!;

        const arg = getDecoratorArgument(decorator);

        expect(arg).toBeDefined();
        expect(ts.isObjectLiteralExpression(arg!)).toBe(true);
    });

    it('should return undefined for decorators without arguments', () => {
        const source = `
      function MyDeco(): ClassDecorator { return () => {}; }
      @MyDeco
      class MyClass {}
    `;
        const { sourceFile } = createProgramFromSource(source);
        const classDecl = sourceFile.statements.find(ts.isClassDeclaration)!;
        const decorator = findDecorator(classDecl, 'MyDeco')!;

        expect(getDecoratorArgument(decorator)).toBeUndefined();
    });
});

// --- getJsDocComment ---

describe('getJsDocComment', () => {
    it('should extract JSDoc comment', () => {
        const source = `
      /** This is a button component */
      class ButtonComponent {}
    `;
        const { checker, sourceFile } = createProgramFromSource(source);
        const classDecl = sourceFile.statements.find(ts.isClassDeclaration)!;

        expect(getJsDocComment(classDecl, checker)).toBe('This is a button component');
    });

    it('should return undefined when there is no JSDoc', () => {
        const source = `class PlainClass {}`;
        const { checker, sourceFile } = createProgramFromSource(source);
        const classDecl = sourceFile.statements.find(ts.isClassDeclaration)!;

        expect(getJsDocComment(classDecl, checker)).toBeUndefined();
    });
});
