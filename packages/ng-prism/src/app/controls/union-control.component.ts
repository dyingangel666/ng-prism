import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';

@Component({
    selector: 'prism-union-control',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './union-control.component.html',
    styleUrl: './union-control.component.css'
})
export class UnionControlComponent {
    readonly value = input('');
    readonly label = input('');
    readonly typeName = input('');
    readonly options = input<string[]>([]);
    readonly valueChange = output<string>();
}
