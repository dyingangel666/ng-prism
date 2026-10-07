import { Component, InjectionToken, type Provider } from '@angular/core';

function Showcase(config: unknown): ClassDecorator {
    return () => {};
}

class DialogService {}

const API_URL = new InjectionToken<string>('API_URL');

function provideDialogs(): Provider[] {
    return [];
}

@Showcase({
    title: 'Deprecated providers',
    providers: [DialogService, { provide: API_URL, useValue: '/api' }, provideDialogs()]
})
@Component({ selector: 'deprecated-providers', standalone: true, template: '' })
export class DeprecatedProvidersComponent {}
