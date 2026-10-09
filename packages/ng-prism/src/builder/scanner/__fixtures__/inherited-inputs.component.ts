import './ambient-module.js';
import { Component, input, output } from '@angular/core';
import { ModuleField } from 'ambient-lib';
import { AmbientField } from './ambient-field.js';
import * as fields from './field-barrel.js';
import DefaultField from './field-base-default.directive.js';
import { FieldBase, GenericField, LegacyBase, LegacyGenericField, ListboxField, NestedField, UndecoratedBase, UndecoratedMiddle } from './field-base.directive.js';
import { LibraryField, LibraryLabelledField, LibraryLogger, LibraryUndecorated } from './library-field.js';

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

    /** Emits when the country picker loses focus */
    override readonly blurred = output<void>();
}

@Showcase({ title: 'Color picker' })
@Component({
    selector: 'my-color-picker',
    standalone: true,
    template: ``
})
export class ColorPickerComponent extends GenericField<Color> {}

@Showcase({ title: 'Nested picker' })
@Component({
    selector: 'my-nested-picker',
    standalone: true,
    template: ``
})
export class NestedPickerComponent extends NestedField<Color> {}

@Showcase({ title: 'Legacy generic' })
@Component({
    selector: 'my-legacy-generic',
    standalone: true,
    template: ``
})
export class LegacyGenericComponent extends LegacyGenericField<Color> {}

@Showcase({ title: 'Legacy child' })
@Component({
    selector: 'my-legacy-child',
    standalone: true,
    template: ``
})
export class LegacyChildComponent extends LegacyBase {
    override title = 'child';

    override count = Math.random();
}

@Showcase({ title: 'Static shadow' })
@Component({
    selector: 'my-static-shadow',
    standalone: true,
    template: ``
})
export class StaticShadowComponent extends FieldBase {
    static label = 'unrelated';
}

@Showcase({ title: 'Undecorated child' })
@Component({
    selector: 'my-undecorated-child',
    standalone: true,
    template: ``
})
export class UndecoratedChildComponent extends UndecoratedBase {
    readonly own = input(0);
}

@Showcase({ title: 'Middle child' })
@Component({
    selector: 'my-middle-child',
    standalone: true,
    template: ``
})
export class MiddleChildComponent extends UndecoratedMiddle {}

@Showcase({ title: 'Default based' })
@Component({
    selector: 'my-default-based',
    standalone: true,
    template: ``
})
export class DefaultBasedComponent extends DefaultField {}

@Showcase({ title: 'Barrel default' })
@Component({
    selector: 'my-barrel-default',
    standalone: true,
    template: ``
})
export class BarrelDefaultComponent extends fields.DefaultField {}

@Showcase({ title: 'Renamed base' })
@Component({
    selector: 'my-renamed-base',
    standalone: true,
    template: ``
})
export class RenamedBaseComponent extends fields.RenamedListboxField {}

// prettier-ignore
@Showcase({ title: 'Parenthesized' })
@Component({
    selector: 'my-parenthesized',
    standalone: true,
    template: ``
})
export class ParenthesizedComponent extends (FieldBase) {}

@Showcase({ title: 'Library backed' })
@Component({
    selector: 'my-library-backed',
    standalone: true,
    template: ``
})
export class LibraryBackedComponent extends LibraryField {
    readonly hint = input('');
}

@Showcase({ title: 'Labelled library' })
@Component({
    selector: 'my-labelled-library',
    standalone: true,
    template: ``
})
export class LabelledLibraryComponent extends LibraryLabelledField {}

@Showcase({ title: 'Undecorated library' })
@Component({
    selector: 'my-undecorated-library',
    standalone: true,
    template: ``
})
export class UndecoratedLibraryComponent extends LibraryUndecorated {}

@Showcase({ title: 'Logging' })
@Component({
    selector: 'my-logging',
    standalone: true,
    template: ``
})
export class LoggingComponent extends LibraryLogger {
    readonly level = input(1);
}

@Showcase({ title: 'Ambient' })
@Component({
    selector: 'my-ambient',
    standalone: true,
    template: ``
})
export class AmbientComponent extends AmbientField {}

@Showcase({ title: 'Module ambient' })
@Component({
    selector: 'my-module-ambient',
    standalone: true,
    template: ``
})
export class ModuleAmbientComponent extends ModuleField {}

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
