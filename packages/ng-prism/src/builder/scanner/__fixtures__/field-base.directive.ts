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

    initial!: T;

    /** Depends on T through the type of its default only */
    readonly fromMember = model(this.initial);
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

    @Input() count = 1;
}

// Angular reads neither: it only inherits from classes with @Directive() or @Component().
export abstract class UndecoratedBase {
    readonly undecoratedLabel = input('x');

    readonly undecoratedChange = output<void>();
}

@Directive()
export abstract class DecoratedRoot {
    readonly rootInput = input('root');

    readonly shared = input('root-shared');
}

export abstract class UndecoratedMiddle extends DecoratedRoot {
    readonly middleInput = input('middle');

    override readonly shared = input('middle-shared');
}
