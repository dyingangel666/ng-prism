import type { InputSignal } from '@angular/core';

type Signal<T> = InputSignal<T>;

// Declared by hand for a class that only exists at runtime: like a .d.ts,
// there is no initializer to read.
export declare abstract class AmbientField {
    readonly ambientLabel: InputSignal<string>;
    readonly importTyped: import('@angular/core').InputSignal<number>;
    readonly aliased: Signal<boolean>;
}
