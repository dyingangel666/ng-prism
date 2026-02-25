import { ColorPickerComponent } from 'test-lib';

export class ColorPickerChangeEvent {
    constructor(
        public source: ColorPickerComponent,
        public value: string
    ) {}
}
