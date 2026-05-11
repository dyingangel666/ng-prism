import { Component } from '@angular/core';

function Showcase(config: unknown): ClassDecorator {
  return () => {};
}

@Showcase({
  description: 'Missing title on purpose — should be skipped with a warning',
})
@Component({
  selector: 'missing-title',
  standalone: true,
  template: `<div>missing title</div>`,
})
export class MissingTitleComponent {}
