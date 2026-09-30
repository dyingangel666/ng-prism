import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Highlight } from 'ngx-highlightjs';
import type { InputMeta, OutputMeta } from '@ng-prism/core/plugin';
import type { JsDocData, MethodDoc } from './jsdoc.types.js';
import { parseExample, renderBlockMarkdown, renderInlineMarkdown, type ParsedExample } from './markdown.js';

@Component({
    selector: 'prism-jsdoc-panel',
    standalone: true,
    imports: [Highlight],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './jsdoc-panel.component.html',
    styleUrl: './jsdoc-panel.component.css'
})
export class JsDocPanelComponent {
    readonly activeComponent = input<unknown>(null);

    private readonly sanitizer = inject(DomSanitizer);

    protected readonly jsdocData = computed<JsDocData | null>(() => {
        const comp = this.activeComponent() as any;
        return (comp?.meta?.showcaseConfig?.meta?.['jsdoc'] as JsDocData) ?? null;
    });

    protected readonly inputs = computed<InputMeta[]>(() => {
        const comp = this.activeComponent() as any;
        return comp?.meta?.inputs ?? [];
    });

    protected readonly outputs = computed<OutputMeta[]>(() => {
        const comp = this.activeComponent() as any;
        return comp?.meta?.outputs ?? [];
    });

    protected readonly classDescription = computed(() => this.jsdocData()?.classDescription);

    // Source is component-author JSDoc compiled into the manifest at build time,
    // not user input — bypassing sanitization is safe here.
    protected readonly renderedClassDescription = computed<SafeHtml | null>(() => {
        const html = renderBlockMarkdown(this.classDescription());
        return html ? this.sanitizer.bypassSecurityTrustHtml(html) : null;
    });

    protected readonly classTags = computed(() => this.jsdocData()?.classTags ?? {});

    protected readonly isDeprecated = computed(() => !!this.classTags().deprecated);

    protected readonly deprecatedMessage = computed(() => {
        const d = this.classTags().deprecated;
        return typeof d === 'string' ? d : undefined;
    });

    protected readonly since = computed(() => this.classTags().since);

    protected readonly version = computed(() => this.classTags().version);

    protected readonly seeRefs = computed(() => this.classTags().see ?? []);

    protected readonly examples = computed(() => this.classTags().example ?? []);

    protected readonly methods = computed<MethodDoc[]>(() => this.jsdocData()?.methods ?? []);

    protected readonly hasTags = computed(() => this.isDeprecated() || !!this.since() || !!this.version() || this.seeRefs().length > 0);

    protected isMemberDeprecated(name: string): boolean {
        return !!this.jsdocData()?.memberTags[name]?.deprecated;
    }

    protected getMemberSince(name: string): string | undefined {
        return this.jsdocData()?.memberTags[name]?.since;
    }

    protected renderInline(text: string | undefined): SafeHtml {
        return this.sanitizer.bypassSecurityTrustHtml(renderInlineMarkdown(text));
    }

    protected parseExample(raw: string): ParsedExample {
        return parseExample(raw);
    }

    protected formatDefault(value: unknown): string {
        if (typeof value === 'string') return `'${value}'`;
        return String(value);
    }
}
