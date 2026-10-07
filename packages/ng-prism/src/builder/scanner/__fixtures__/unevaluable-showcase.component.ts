import { Component, input } from '@angular/core';

function Showcase(config: unknown): ClassDecorator {
    return () => {};
}

function megabytes(count: number): number {
    return count * 1024 * 1024;
}

function acceptedA11yRules(): Record<string, unknown> {
    return { a11y: { accept: ['color-contrast'] } };
}

function defaultFormat(): string {
    return 'png';
}

function buildVariant(): Record<string, unknown> {
    return { name: 'Built' };
}

@Component({ selector: 'unevaluable-child', standalone: true, template: '' })
class ChildComponent {}

@Showcase({
    title: 'Unevaluable',
    meta: { ...acceptedA11yRules(), figma: 'https://www.figma.com/design/abc123/DS' },
    variants: [
        { name: 'Plain', inputs: { label: 'Plain', validator: (value: string) => value.length > 0 } },
        { name: 'Auto hint', inputs: { label: 'Auto hint', maxFileSize: megabytes(5) } },
        buildVariant()
    ]
})
@Component({
    selector: 'unevaluable',
    standalone: true,
    template: '',
    imports: [ChildComponent]
})
export class UnevaluableShowcaseComponent {
    readonly label = input('');
    readonly maxFileSize = input(megabytes(5));
    readonly formats = input(['pdf', defaultFormat()]);
    readonly rules = input({ ...acceptedA11yRules(), level: 'AA' });
}
