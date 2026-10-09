import { Directive, input } from '@angular/core';

@Directive()
export default abstract class DefaultField {
    readonly fromDefault = input(1);
}
