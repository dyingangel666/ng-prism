import { Component, input } from '@angular/core';
import { FieldBase, GenericField, ListboxField } from './field-base.directive.js';
import { LibraryField, LibraryLogger } from './library-field.js';

function Showcase(config: unknown): ClassDecorator {
    return () => {};
}

export type Color = 'red' | 'green';

@Showcase({
    title: 'Country picker',
    variants: [{ name: 'Countries', inputs: { options: [{ id: 'de', label: 'Germany' }], value: 'de' } }]
})
@Component({
    selector: 'my-country-picker',
    standalone: true,
    template: ``
})
export class CountryPickerComponent extends ListboxField {
    /** Label of the country picker */
    override readonly label = input('Country');

    /** Whether to show flags next to the names */
    readonly showFlags = input(true);
}

@Showcase({ title: 'Color picker' })
@Component({
    selector: 'my-color-picker',
    standalone: true,
    template: ``
})
export class ColorPickerComponent extends GenericField<Color> {}

@Showcase({ title: 'Library backed' })
@Component({
    selector: 'my-library-backed',
    standalone: true,
    template: ``
})
export class LibraryBackedComponent extends LibraryField {
    readonly hint = input('');
}

@Showcase({ title: 'Logging' })
@Component({
    selector: 'my-logging',
    standalone: true,
    template: ``
})
export class LoggingComponent extends LibraryLogger {
    readonly level = input(1);
}

function withTracking<T extends abstract new (...args: any[]) => object>(base: T): T {
    return base;
}

@Showcase({ title: 'Mixin' })
@Component({
    selector: 'my-mixin',
    standalone: true,
    template: ``
})
export class MixinComponent extends withTracking(FieldBase) {
    readonly tracked = input(true);
}
