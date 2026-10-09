import { Directive, Input, input, model, output } from '@angular/core';

export type Size = 'sm' | 'md';

export interface ListboxItem {
    id: string;
    label: string;
}

@Directive()
export abstract class FieldBase {
    /** Label above the field */
    readonly label = input('');

    /** Whether the field is disabled */
    readonly disabled = input(false);

    /** Emits when the field loses focus */
    readonly blurred = output<void>();
}

@Directive()
export abstract class ListboxField extends FieldBase {
    /** Selectable options */
    readonly options = input.required<ListboxItem[]>();

    /** Id of the selected option */
    readonly value = model<string | null>(null);
}

@Directive()
export abstract class GenericField<T> {
    /** Items to choose from */
    readonly items = input.required<T[]>();

    /** The chosen item */
    readonly selected = model<T | null>(null);

    /** Does not depend on T */
    readonly size = input<Size>();
}

@Directive()
export abstract class NestedField<U> extends GenericField<U[]> {}

@Directive()
export abstract class LegacyGenericField<T> {
    @Input() legacy: T | null = null;
}

@Directive()
export abstract class LegacyBase {
    @Input() title = 'base';
}

// Angular reads neither: it only inherits from classes with @Directive() or @Component().
export abstract class UndecoratedBase {
    readonly undecoratedLabel = input('x');

    readonly undecoratedChange = output<void>();
}

@Directive()
export abstract class DecoratedRoot {
    readonly rootInput = input('root');
}

export abstract class UndecoratedMiddle extends DecoratedRoot {
    readonly middleInput = input('middle');
}
