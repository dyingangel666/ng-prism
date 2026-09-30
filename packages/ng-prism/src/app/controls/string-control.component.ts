import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';

@Component({
    selector: 'prism-string-control',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './string-control.component.html',
    styleUrl: './string-control.component.css'
})
export class StringControlComponent {
    readonly value = input('');
    readonly label = input('');
    readonly typeName = input('');
    readonly valueChange = output<string>();
}
