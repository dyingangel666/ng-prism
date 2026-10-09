import { Component, input } from '@angular/core';
import { DocumentedField } from './documented-field.js';

/** Text input built on the shared field. */
@Component({ selector: 'doc-input', standalone: true, template: '' })
export class DocumentedInputComponent extends DocumentedField {
    static tone = 'unrelated';

    /** Label of the input */
    override readonly label = input('Name');

    override readonly size = input('l');

    override open(): void {}
}
