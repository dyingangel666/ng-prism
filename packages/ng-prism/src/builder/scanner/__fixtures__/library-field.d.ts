// Stands in for a base class shipped by an npm package: only declarations,
// no initializers, so `input()` calls and defaults are gone.
import * as i0 from '@angular/core';

export declare abstract class LibraryField {
    /** Placeholder text */
    readonly placeholder: i0.InputSignal<string>;
}

export declare abstract class LibraryLogger {
    protected log(message: string): void;
}
