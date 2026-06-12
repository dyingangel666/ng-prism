import { Component } from '@angular/core';

interface ShowcaseConfig {
  title: string;
  category?: string;
  section?: string;
  sectionOrder?: number;
}

function Showcase(config: ShowcaseConfig): ClassDecorator {
  return () => {};
}

@Showcase({
  title: 'Sectioned',
  category: 'Misc',
  section: 'Pipes',
  sectionOrder: 5,
})
@Component({
  selector: 'sectioned',
  standalone: true,
  template: '',
})
export class SectionedComponent {}
