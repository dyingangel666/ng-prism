import path from 'node:path';
import ts from 'typescript';
import { scanComponents } from './component.scanner.js';
import { resolveEntryPointExports } from './entry-point.scanner.js';

const FIXTURES_DIR = path.join(__dirname, '__fixtures__');

const compilerOptions: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ES2022,
    moduleResolution: ts.ModuleResolutionKind.Node10,
    experimentalDecorators: true,
    strict: true,
    skipLibCheck: true
};

describe('scanComponents', () => {
    let checker: ts.TypeChecker;
    let exports: ts.Symbol[];

    beforeAll(() => {
        const entryFile = path.join(FIXTURES_DIR, 'public-api.ts');
        const result = resolveEntryPointExports([{ entryFile, importPath: 'fixture' }], compilerOptions);

        checker = result.program.getTypeChecker();
        exports = result.entries[0].exports;
    });

    it('should find only @Showcase-annotated components', () => {
        const components = scanComponents(exports, checker);
        const names = components.map((c) => c.className);

        expect(names).toContain('ButtonComponent');
        expect(names).toContain('CardComponent');
        expect(names).toContain('SignalButtonComponent');
        expect(names).toContain('ModelInputComponent');
        expect(names).toContain('HighlightDirective');
        expect(names).toContain('InvalidBgComponent');
        expect(names).toContain('InvalidStatusComponent');
        expect(names).toContain('SectionedComponent');
        expect(names).not.toContain('NoShowcaseComponent');
        expect(components).toHaveLength(9);
    });

    it('should extract showcase config for ButtonComponent', () => {
        const components = scanComponents(exports, checker);
        const button = components.find((c) => c.className === 'ButtonComponent')!;

        expect(button.showcaseConfig.title).toBe('Button');
        expect(button.showcaseConfig.category).toBe('Inputs');
        expect(button.showcaseConfig.description).toBe('A versatile button component');
        expect(button.showcaseConfig.tags).toEqual(['form', 'action']);
    });

    it('should extract variants', () => {
        const components = scanComponents(exports, checker);
        const button = components.find((c) => c.className === 'ButtonComponent')!;

        expect(button.showcaseConfig.variants).toHaveLength(2);
        expect(button.showcaseConfig.variants![0].name).toBe('Primary');
        expect(button.showcaseConfig.variants![0].inputs).toEqual({
            variant: 'primary',
            label: 'Click me'
        });
        expect(button.showcaseConfig.variants![1].name).toBe('Danger');
        expect(button.showcaseConfig.variants![1].inputs).toEqual({
            variant: 'danger',
            disabled: true
        });
    });

    it('should extract variant-level meta', () => {
        const components = scanComponents(exports, checker);
        const button = components.find((c) => c.className === 'ButtonComponent')!;

        expect(button.showcaseConfig.variants![0].meta).toEqual({
            figma: 'https://www.figma.com/design/abc123/DS?node-id=12-34'
        });
        expect(button.showcaseConfig.variants![1].meta).toBeUndefined();
    });

    it('should extract component metadata (selector, standalone)', () => {
        const components = scanComponents(exports, checker);
        const button = components.find((c) => c.className === 'ButtonComponent')!;

        expect(button.componentMeta.selector).toBe('my-button');
        expect(button.componentMeta.standalone).toBe(true);
    });

    it('should extract inputs and outputs', () => {
        const components = scanComponents(exports, checker);
        const button = components.find((c) => c.className === 'ButtonComponent')!;

        expect(button.inputs.length).toBe(5);
        expect(button.outputs.length).toBe(2);
        expect(button.inputs[0].name).toBe('variant');
        expect(button.outputs[0].name).toBe('clicked');
    });

    it('should set filePath', () => {
        const components = scanComponents(exports, checker);
        const button = components.find((c) => c.className === 'ButtonComponent')!;

        expect(button.filePath).toContain('button.component.ts');
    });

    it('should handle CardComponent with minimal config', () => {
        const components = scanComponents(exports, checker);
        const card = components.find((c) => c.className === 'CardComponent')!;

        expect(card.showcaseConfig.title).toBe('Card');
        expect(card.showcaseConfig.category).toBe('Layout');
        expect(card.showcaseConfig.variants).toBeUndefined();
        expect(card.showcaseConfig.tags).toBeUndefined();
        expect(card.inputs).toHaveLength(2);
        expect(card.outputs).toHaveLength(0);
    });

    it('should set isDirective true for directives', () => {
        const components = scanComponents(exports, checker);
        const highlight = components.find((c) => c.className === 'HighlightDirective')!;

        expect(highlight.componentMeta.isDirective).toBe(true);
        expect(highlight.componentMeta.selector).toBe('[appHighlight]');
        expect(highlight.componentMeta.standalone).toBe(true);
    });

    it('should set isDirective false for components', () => {
        const components = scanComponents(exports, checker);
        const button = components.find((c) => c.className === 'ButtonComponent')!;

        expect(button.componentMeta.isDirective).toBe(false);
    });

    it('should extract inputs and outputs from directives', () => {
        const components = scanComponents(exports, checker);
        const highlight = components.find((c) => c.className === 'HighlightDirective')!;

        expect(highlight.inputs).toHaveLength(1);
        expect(highlight.inputs[0].name).toBe('highlightColor');
        expect(highlight.inputs[0].type).toBe('string');
        expect(highlight.inputs[0].defaultValue).toBe('yellow');

        expect(highlight.outputs).toHaveLength(1);
        expect(highlight.outputs[0].name).toBe('highlighted');
    });

    it('should extract host config from directive showcase', () => {
        const components = scanComponents(exports, checker);
        const highlight = components.find((c) => c.className === 'HighlightDirective')!;

        expect(highlight.showcaseConfig.host).toBe('<span class="demo-text">');
    });

    it('should warn when @Showcase class uses @Input() decorators', () => {
        const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

        scanComponents(exports, checker);

        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('ButtonComponent uses @Input() decorators'));

        warnSpy.mockRestore();
    });

    it('should warn and skip @Showcase classes without a title', () => {
        const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
        const components = scanComponents(exports, checker);

        expect(components.find((c) => c.className === 'MissingTitleComponent')).toBeUndefined();
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('MissingTitleComponent has @Showcase without a "title" field'));

        warnSpy.mockRestore();
    });

    it('should warn that a checker background is deprecated', () => {
        const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

        scanComponents(exports, checker);

        // Once for the component and once for the variant that declares its own:
        // a reviewer fixing this has to find both, and only the variant warning
        // says which variant.
        const messages = warnSpy.mock.calls.map((call) => String(call[0])).filter((message) => message.includes('DeprecatedBgComponent'));

        expect(messages.filter((m) => m.includes('deprecated'))).toHaveLength(2);
        expect(messages.some((m) => m.includes('Also checker'))).toBe(true);

        warnSpy.mockRestore();
    });

    it('should keep a checker background despite deprecating it', () => {
        const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
        const components = scanComponents(exports, checker);
        const deprecated = components.find((c) => c.className === 'DeprecatedBgComponent')!;

        // Deprecated is not invalid. Dropping the value would change what the
        // component renders on, which is a break dressed up as a warning.
        expect(deprecated.showcaseConfig.bg).toBe('checker');
        expect(deprecated.showcaseConfig.variants?.[0].bg).toBe('checker');

        warnSpy.mockRestore();
    });

    it('should not warn for signal-based components', () => {
        const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

        scanComponents(exports, checker);

        expect(warnSpy).not.toHaveBeenCalledWith(expect.stringContaining('SignalButtonComponent'));
        expect(warnSpy).not.toHaveBeenCalledWith(expect.stringContaining('HighlightDirective'));

        warnSpy.mockRestore();
    });

    it('should extract component-level bg', () => {
        const components = scanComponents(exports, checker);
        const button = components.find((c) => c.className === 'ButtonComponent')!;

        expect(button.showcaseConfig.bg).toBe('dark');
    });

    it('should extract variant-level bg', () => {
        const components = scanComponents(exports, checker);
        const button = components.find((c) => c.className === 'ButtonComponent')!;

        expect(button.showcaseConfig.variants![0].bg).toBe('light');
        expect(button.showcaseConfig.variants![1].bg).toBeUndefined();
    });

    it('should leave bg undefined when not declared', () => {
        const components = scanComponents(exports, checker);
        const card = components.find((c) => c.className === 'CardComponent')!;

        expect(card.showcaseConfig.bg).toBeUndefined();
    });

    it('should warn and skip invalid bg values', () => {
        const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
        const components = scanComponents(exports, checker);

        const invalid = components.find((c) => c.className === 'InvalidBgComponent')!;

        expect(invalid.showcaseConfig.bg).toBeUndefined();
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('InvalidBgComponent declares invalid bg "rainbow"'));

        warnSpy.mockRestore();
    });

    it('should extract status from showcase config', () => {
        const components = scanComponents(exports, checker);
        const button = components.find((c) => c.className === 'ButtonComponent')!;

        expect(button.showcaseConfig.status).toBe('beta');
    });

    it('should leave status undefined when not declared', () => {
        const components = scanComponents(exports, checker);
        const card = components.find((c) => c.className === 'CardComponent')!;

        expect(card.showcaseConfig.status).toBeUndefined();
    });

    it('should warn and skip invalid status values', () => {
        const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
        const components = scanComponents(exports, checker);

        const invalid = components.find((c) => c.className === 'InvalidStatusComponent')!;

        expect(invalid.showcaseConfig.status).toBeUndefined();
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('InvalidStatusComponent declares invalid status "banana"'));

        warnSpy.mockRestore();
    });

    it('extracts section and sectionOrder from showcaseConfig', () => {
        const components = scanComponents(exports, checker);
        const sectioned = components.find((c) => c.className === 'SectionedComponent')!;

        expect(sectioned.showcaseConfig.section).toBe('Pipes');
        expect(sectioned.showcaseConfig.sectionOrder).toBe(5);
    });

    it('extracts categoryOrder and componentOrder from showcaseConfig', () => {
        const components = scanComponents(exports, checker);
        const sectioned = components.find((c) => c.className === 'SectionedComponent')!;

        expect(sectioned.showcaseConfig.categoryOrder).toBe(3);
        expect(sectioned.showcaseConfig.componentOrder).toBe(2);
    });

    it('counts the values it rejects as diagnostics, but not deprecations or @Input() hints', () => {
        const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
        const diagnostics: string[] = [];

        scanComponents(exports, checker, diagnostics);

        expect(diagnostics).toEqual([
            expect.stringContaining('MissingTitleComponent has @Showcase without a "title" field'),
            expect.stringContaining('InvalidBgComponent declares invalid bg "rainbow"'),
            expect.stringContaining('InvalidStatusComponent declares invalid status "banana"')
        ]);

        warnSpy.mockRestore();
    });

    it('omits section and sectionOrder when not declared', () => {
        const components = scanComponents(exports, checker);
        const button = components.find((c) => c.className === 'ButtonComponent')!;

        expect(button.showcaseConfig.section).toBeUndefined();
        expect(button.showcaseConfig.sectionOrder).toBeUndefined();
    });
});

describe('scanComponents with @Showcase values it cannot evaluate', () => {
    let checker: ts.TypeChecker;
    let exports: ts.Symbol[];
    let warnSpy: jest.SpyInstance;

    beforeAll(() => {
        const entryFile = path.join(FIXTURES_DIR, 'unevaluable-api.ts');
        const result = resolveEntryPointExports([{ entryFile, importPath: 'fixture' }], compilerOptions);

        checker = result.program.getTypeChecker();
        exports = result.entries[0].exports;
    });

    beforeEach(() => {
        warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    });

    afterEach(() => {
        warnSpy.mockRestore();
    });

    function scan() {
        const diagnostics: string[] = [];
        const components = scanComponents(exports, checker, diagnostics);

        return { components, diagnostics };
    }

    it('warns with the component, the path in the config and the source location', () => {
        const message = scan().diagnostics.find((d) => d.includes('maxFileSize'))!;

        expect(message).toContain('UnevaluableShowcaseComponent › variants[1] "Auto hint" › inputs.maxFileSize — "megabytes(5)" (');
        expect(message).toContain('src/builder/scanner/__fixtures__/unevaluable-showcase.component.ts:31:73) cannot be evaluated statically and was dropped.');
        expect(message).not.toContain(FIXTURES_DIR);
        expect(warnSpy).toHaveBeenCalledWith(`⚠ ng-prism: ${message}`);
    });

    it('reports exactly the @Showcase values it drops, nothing from @Component or input defaults', () => {
        const where = scan().diagnostics.map((d) => d.split(' — ')[0]);

        expect(where).toEqual([
            'UnevaluableShowcaseComponent › meta',
            'UnevaluableShowcaseComponent › variants[0] "Plain" › inputs.validator',
            'UnevaluableShowcaseComponent › variants[1] "Auto hint" › inputs.maxFileSize',
            'UnevaluableShowcaseComponent › variants[2]',
            'TopLevelSpreadComponent › @Showcase',
            'UnevaluableRootComponent › @Showcase',
            expect.stringMatching(/^DeprecatedProvidersComponent declares @Showcase providers/),
            'ConstantShowcaseComponent › variants[1] "Retry" › inputs.retries',
            expect.stringMatching(/^ConstConfigProvidersComponent declares @Showcase providers \(.*indirect-providers\.component\.ts:17:11\)/),
            expect.stringMatching(/^SpreadProvidersComponent declares @Showcase providers \(.*indirect-providers\.component\.ts:9:\d+\)/)
        ]);
    });

    it('resolves constants, enum members and spread constants, also from other files', () => {
        const component = scan().components.find((c) => c.className === 'ConstantShowcaseComponent')!;

        expect(component.showcaseConfig.meta).toEqual({ a11y: { accept: ['color-contrast'] }, figma: 'https://www.figma.com/design/abc123/DS' });
        expect(component.showcaseConfig.variants![0].inputs).toEqual({ maxFileSize: 5242880, maxFiles: 3, size: 'm' });
    });

    it('names the reference behind a value it had to drop', () => {
        const message = scan().diagnostics.find((d) => d.includes('inputs.retries'))!;

        expect(message).toContain(
            'constant-showcase.component.ts:21:36) cannot be evaluated statically and was dropped: retries is declared with let; only const declarations can be read.'
        );
    });

    it('does not resolve @Component fields it never reads', () => {
        const looked: string[] = [];
        const recording = new Proxy(checker, {
            get(target, property, receiver) {
                if (property === 'getSymbolAtLocation') {
                    return (node: ts.Node) => {
                        looked.push(node.getText());
                        return target.getSymbolAtLocation(node);
                    };
                }
                const member = Reflect.get(target, property, receiver);

                return typeof member === 'function' ? member.bind(target) : member;
            }
        });

        scanComponents(exports, recording, []);

        expect(looked).not.toContain('ChildComponent');
        expect(looked).toContain('SELECTOR');
    });

    it('resolves a constant selector in @Component', () => {
        const component = scan().components.find((c) => c.className === 'ConstantShowcaseComponent')!;

        expect(component.componentMeta.selector).toBe('constant-showcase');
    });

    it('warns once about deprecated providers instead of once per provider', () => {
        const messages = scan().diagnostics.filter((d) => d.startsWith('DeprecatedProvidersComponent'));

        expect(messages).toHaveLength(1);
        expect(messages[0]).toContain('deprecated-providers.component.ts:17:5), which are deprecated and will be removed in 23.0.0');
        expect(messages[0]).toContain('defineConfig({ appProviders })');
    });

    it('drops only the value it cannot evaluate', () => {
        const component = scan().components.find((c) => c.className === 'UnevaluableShowcaseComponent')!;

        expect(component.showcaseConfig.meta).toEqual({ figma: 'https://www.figma.com/design/abc123/DS' });
        expect(component.showcaseConfig.variants!.map((v) => v.inputs)).toEqual([{ label: 'Plain' }, { label: 'Auto hint' }]);
    });

    it('says when a value is a function that can never reach the manifest', () => {
        const message = scan().diagnostics.find((d) => d.includes('validator'))!;

        expect(message).toContain('"(value: string) => value.length > 0" (');
        expect(message).toContain(':30:63) is a runtime value (function, class or instance) and cannot be part of the static manifest; it was dropped.');
    });

    it('keeps a component whose @Showcase spreads at the top level', () => {
        const { components, diagnostics } = scan();
        const component = components.find((c) => c.className === 'TopLevelSpreadComponent')!;

        expect(component.showcaseConfig.title).toBe('Top-level spread');
        expect(diagnostics).toContainEqual(expect.stringContaining('TopLevelSpreadComponent › @Showcase — "...sharedShowcase()" ('));
    });

    it('skips a component whose whole @Showcase argument cannot be evaluated, and says so', () => {
        const { components, diagnostics } = scan();

        expect(components.find((c) => c.className === 'UnevaluableRootComponent')).toBeUndefined();
        expect(diagnostics).toContainEqual(
            expect.stringMatching(
                /UnevaluableRootComponent › @Showcase — "buildShowcase\(\)" \(.*:11:11\) cannot be evaluated statically, so the component is skipped\.$/
            )
        );
    });

    it('reports a loss once when a component is scanned from several entry points', () => {
        const diagnostics: string[] = [];

        scanComponents(exports, checker, diagnostics);
        scanComponents(exports, checker, diagnostics);

        expect(diagnostics).toHaveLength(10);
        expect(warnSpy.mock.calls.filter(([message]) => String(message).includes('megabytes(5)'))).toHaveLength(1);
    });
});
