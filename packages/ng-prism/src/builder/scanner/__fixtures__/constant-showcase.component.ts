import { Component, input } from '@angular/core';
import { MAX_FILES, MB, SHARED_META, Size } from './showcase-constants.js';

function Showcase(config: unknown): ClassDecorator {
    return () => {};
}

const SELECTOR = 'constant-showcase';

let retries = 3;

export function retry(): void {
    retries += 1;
}

@Showcase({
    title: 'Constants',
    meta: { ...SHARED_META, figma: 'https://www.figma.com/design/abc123/DS' },
    variants: [
        { name: 'Upload', inputs: { maxFileSize: 5 * MB, maxFiles: MAX_FILES, size: Size.Medium } },
        { name: 'Retry', inputs: { retries } }
    ]
})
@Component({ selector: SELECTOR, standalone: true, template: '' })
export class ConstantShowcaseComponent {
    readonly maxFiles = input(MAX_FILES);
}
