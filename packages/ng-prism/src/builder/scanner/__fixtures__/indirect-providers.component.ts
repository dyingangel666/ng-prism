import { Component } from '@angular/core';

function Showcase(config: unknown): ClassDecorator {
    return () => {};
}

class DialogService {}

const SHARED_SHOWCASE = { category: 'Overlays', providers: [DialogService] };

const CONST_CONFIG = { title: 'Constant config', providers: [] };

@Showcase({ ...SHARED_SHOWCASE, title: 'Spread providers' })
@Component({ selector: 'spread-providers', standalone: true, template: '' })
export class SpreadProvidersComponent {}

@Showcase(CONST_CONFIG)
@Component({ selector: 'const-config-providers', standalone: true, template: '' })
export class ConstConfigProvidersComponent {}
