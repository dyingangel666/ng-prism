import { Directive, input, output } from '@angular/core';

interface ShowcaseConfig {
  title: string;
  description?: string;
  category?: string;
  variants?: { name: string; inputs?: Record<string, unknown>; content?: string }[];
  tags?: string[];
  host?: string | { selector: string; import: { name: string; from: string }; inputs?: Record<string, unknown> };
}

function Showcase(config: ShowcaseConfig): ClassDecorator {
  return () => {};
}

@Showcase({
  title: 'Highlight',
  category: 'Utility',
  description: 'Highlights the host element on hover',
  host: '<span class="demo-text">',
  variants: [
    { name: 'Yellow', inputs: { highlightColor: 'yellow' }, content: 'Hover me' },
    { name: 'Cyan', inputs: { highlightColor: 'cyan' }, content: 'Hover me' },
  ],
  tags: ['visual', 'hover'],
})
@Directive({
  selector: '[appHighlight]',
  standalone: true,
})
export class HighlightDirective {
  highlightColor = input('yellow');
  highlighted = output<boolean>();
}
