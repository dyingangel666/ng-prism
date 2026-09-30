import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';

@Component({
    selector: 'prism-number-control',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './number-control.component.html',
    styleUrl: './number-control.component.css'
})
export class NumberControlComponent {
    readonly value = input(0);
    readonly label = input('');
    readonly typeName = input('');
    readonly valueChange = output<number>();
}
