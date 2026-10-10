import { Directive, input } from '@angular/core';

@Directive()
export abstract class DocumentedField {
    /**
     * Placeholder text.
     * @deprecated Use the label instead.
     * @since 2.0.0
     */
    readonly placeholder = input('');

    /**
     * Replaced by every subclass.
     * @deprecated Shadowed, so this never shows.
     */
    readonly label = input('');

    /**
     * Size of the field.
     * @since 1.2.0
     */
    readonly size = input('m');

    /**
     * Tone of the field.
     * @since 1.3.0
     */
    readonly tone = input('neutral');

    /**
     * Moves focus into the field.
     * @since 2.1.0
     */
    focus(): void {}

    /**
     * Opens the field.
     * @since 1.0.0
     */
    open(): void {}
}

@Directive()
export abstract class AccessorField {
    private current = '';

    get value(): string {
        return this.current;
    }

    /**
     * Value of the field.
     * @since 3.0.0
     */
    set value(next: string) {
        this.current = next;
    }
}
