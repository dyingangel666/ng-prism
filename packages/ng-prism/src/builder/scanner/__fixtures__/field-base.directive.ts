import { Directive, input, model, output } from '@angular/core';

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
}
