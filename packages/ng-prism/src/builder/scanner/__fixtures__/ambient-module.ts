// A script, not a module, so this declares the module 'ambient-lib' instead of augmenting it.
declare module 'ambient-lib' {
    import type { InputSignal } from '@angular/core';

    export abstract class ModuleField {
        readonly moduleLabel: InputSignal<string>;
    }
}
