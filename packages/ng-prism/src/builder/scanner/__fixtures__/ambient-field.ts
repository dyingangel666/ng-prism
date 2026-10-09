import type { InputSignal } from '@angular/core';

// Declared by hand for a class that only exists at runtime: like a .d.ts,
// there is no initializer to read.
export declare abstract class AmbientField {
    readonly ambientLabel: InputSignal<string>;
}
