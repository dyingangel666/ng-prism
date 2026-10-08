import { Component } from '@angular/core';

interface ShowcaseConfig {
    title: string;
    category?: string;
    section?: string;
    sectionOrder?: number;
    categoryOrder?: number;
    componentOrder?: number;
}

function Showcase(config: ShowcaseConfig): ClassDecorator {
    return () => {};
}

@Showcase({
    title: 'Sectioned',
    category: 'Misc',
    section: 'Pipes',
    sectionOrder: 5,
    categoryOrder: 3,
    componentOrder: 2
})
@Component({
    selector: 'sectioned',
    standalone: true,
    template: ''
})
export class SectionedComponent {}
