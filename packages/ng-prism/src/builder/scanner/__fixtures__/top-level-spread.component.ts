import { Component } from '@angular/core';

function Showcase(config: unknown): ClassDecorator {
    return () => {};
}

function sharedShowcase(): Record<string, unknown> {
    return { category: 'Shared' };
}

@Showcase({ ...sharedShowcase(), title: 'Top-level spread' })
@Component({ selector: 'top-level-spread', standalone: true, template: '' })
export class TopLevelSpreadComponent {}
