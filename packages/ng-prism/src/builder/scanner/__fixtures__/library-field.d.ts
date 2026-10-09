// Stands in for base classes shipped by an npm package: only declarations,
// no initializers, so `input()` calls and defaults are gone. What is left is
// the input map the Angular compiler writes into `ɵdir`.
import * as i0 from '@angular/core';

export declare abstract class LibraryField {
    /** Placeholder text */
    readonly placeholder: i0.InputSignal<string>;
    maxLength: number;
    static ɵfac: i0.ɵɵFactoryDeclaration<LibraryField, never>;
    static ɵdir: i0.ɵɵDirectiveDeclaration<
        LibraryField,
        never,
        never,
        { placeholder: { alias: 'placeholder'; required: false; isSignal: true }; maxLength: { alias: 'maxlength'; required: false } },
        Record<string, never>,
        never,
        never,
        true,
        never
    >;
}

export declare abstract class LibraryLabelledField extends LibraryField {
    readonly label: i0.InputSignal<string>;
    static ɵfac: i0.ɵɵFactoryDeclaration<LibraryLabelledField, never>;
    // Quoted the way the Angular compiler writes it.
    // prettier-ignore
    static ɵdir: i0.ɵɵDirectiveDeclaration<LibraryLabelledField, never, never, { "label": { "alias": "label"; "required": true; "isSignal": true; }; }, Record<string, never>, never, never, true, never>;
}

export declare abstract class LibraryLogger {
    protected log(message: string): void;
}
