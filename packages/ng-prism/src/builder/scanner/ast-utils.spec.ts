import ts from 'typescript';
import {
  evaluateExpression,
  findDecorator,
  getDecoratorArgument,
  getJsDocComment,
} from './ast-utils.js';

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
      value: 42,
    });
  });

  it('should evaluate nested structures', () => {
    const result = evaluateExpression(
      parseExpression("({ items: ['a', 'b'], nested: { x: 1 } })"),
    );
    expect(result).toEqual({ items: ['a', 'b'], nested: { x: 1 } });
  });

  it('should return undefined for variable references', () => {
    expect(evaluateExpression(parseExpression('someVar'))).toBeUndefined();
  });

  it('should return undefined for function calls', () => {
    expect(evaluateExpression(parseExpression('fn()'))).toBeUndefined();
  });

  it('should return undefined for arrays with spread', () => {
    expect(evaluateExpression(parseExpression('[...items]'))).toBeUndefined();
  });

  it('should return undefined for objects with spread', () => {
    expect(evaluateExpression(parseExpression('({ ...base })'))).toBeUndefined();
  });

  it('should evaluate objects with keyword property names', () => {
    const result = evaluateExpression(
      parseExpression("({ import: { name: 'Foo', from: 'bar' }, default: 'baz' })"),
    );
    expect(result).toEqual({ import: { name: 'Foo', from: 'bar' }, default: 'baz' });
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
