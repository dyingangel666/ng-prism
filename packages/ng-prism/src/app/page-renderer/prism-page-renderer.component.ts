import { Component, effect, ElementRef, inject } from '@angular/core';
import { JsonPipe, NgComponentOutlet } from '@angular/common';
import { PrismNavigationService } from '../services/prism-navigation.service.js';

@Component({
    selector: 'prism-page-renderer',
    standalone: true,
    imports: [JsonPipe, NgComponentOutlet],
    templateUrl: './prism-page-renderer.component.html',
    styleUrl: './prism-page-renderer.component.css'
})
export class PrismPageRendererComponent {
    private readonly nav = inject(PrismNavigationService);
    private readonly host = inject(ElementRef<HTMLElement>);
    protected readonly page = this.nav.activePage;

    constructor() {
        effect(() => {
            this.page();
            this.host.nativeElement.scrollTop = 0;
        });
    }
}
