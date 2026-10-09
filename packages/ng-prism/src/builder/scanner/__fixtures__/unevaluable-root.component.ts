import { Component } from '@angular/core';

function Showcase(config: unknown): ClassDecorator {
    return () => {};
}

function buildShowcase(): Record<string, unknown> {
    return { title: 'Built at runtime' };
}

@Showcase(buildShowcase())
@Component({ selector: 'unevaluable-root', standalone: true, template: '' })
export class UnevaluableRootComponent {}
