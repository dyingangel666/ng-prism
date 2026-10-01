import { OverlayModule } from '@angular/cdk/overlay';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Showcase } from '@ng-prism/core';

@Showcase({
    title: 'Toolbar',
    category: 'Components',
    description: 'ToolbarComponent from test-ui-kit/toolbar secondary entry point.',
    variants: [{ name: 'Default', inputs: { label: 'Toolbar' } }]
})
@Component({
    selector: 'uk-toolbar',
    standalone: true,
    imports: [CommonModule, MatToolbarModule, OverlayModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `<div class="uk">{{ label() }}</div>`,
    styles: `
        :host {
            display: inline-block;
        }
        .uk {
            padding: 8px;
        }
    `
})
export class ToolbarComponent {
    readonly label = input<string>('Toolbar');
}
