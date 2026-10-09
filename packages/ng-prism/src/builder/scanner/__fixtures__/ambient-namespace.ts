// A script, not a module, so the namespace is global. Inside `declare namespace`
// a class is a declaration only, like one inside `declare module`.
// eslint-disable-next-line @typescript-eslint/no-namespace -- a namespace is what this fixture is about
declare namespace AmbientLib {
    export abstract class ModuleField {
        readonly moduleLabel: import('@angular/core').InputSignal<string>;
    }
}
