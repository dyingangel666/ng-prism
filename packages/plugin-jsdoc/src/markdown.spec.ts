import {
  parseExample,
  renderInlineMarkdown,
  renderBlockMarkdown,
} from './markdown.js';

describe('parseExample', () => {
  it('extracts language and body from a fenced block', () => {
    const raw = '```html\n<x />\n```';
    expect(parseExample(raw)).toEqual({ lang: 'html', code: '<x />' });
  });

  it('falls back to typescript when the fence has no language tag', () => {
    const raw = '```\nconst x = 1;\n```';
    expect(parseExample(raw)).toEqual({
      lang: 'typescript',
      code: 'const x = 1;',
    });
  });

  it('returns the raw text and typescript when no fence is present', () => {
    const raw = '<doc-button label="Click me" />';
    expect(parseExample(raw)).toEqual({
      lang: 'typescript',
      code: '<doc-button label="Click me" />',
    });
  });

  it('handles leading/trailing whitespace around the fence', () => {
    const raw = '\n   ```scss\n.foo { color: red; }\n```   \n';
    expect(parseExample(raw)).toEqual({
      lang: 'scss',
      code: '.foo { color: red; }',
    });
  });

  it('preserves internal newlines in the body', () => {
    const raw = '```html\n<a>\n  <b />\n</a>\n```';
    expect(parseExample(raw)).toEqual({
      lang: 'html',
      code: '<a>\n  <b />\n</a>',
    });
  });
});

describe('renderBlockMarkdown', () => {
  it('renders headings as <h2>', () => {
    const html = renderBlockMarkdown('## Size');
    expect(html).toMatch(/<h2[^>]*>Size<\/h2>/);
  });

  it('renders list items with inline code', () => {
    const html = renderBlockMarkdown('- `small` (4px) — inline indicators');
    expect(html).toMatch(/<ul>/);
    expect(html).toMatch(/<li><code>small<\/code>/);
  });

  it('wraps plain text in <p>', () => {
    const html = renderBlockMarkdown('Primary action button component.');
    expect(html).toMatch(/<p>Primary action button component\.<\/p>/);
  });

  it('returns null for empty input', () => {
    expect(renderBlockMarkdown('')).toBeNull();
    expect(renderBlockMarkdown(undefined)).toBeNull();
  });
});

describe('renderInlineMarkdown', () => {
  it('renders inline code without wrapping <p>', () => {
    const html = renderInlineMarkdown('Use `size` to set the spinner.');
    expect(html).toBe('Use <code>size</code> to set the spinner.');
  });

  it('renders bold and italic without wrapping <p>', () => {
    const html = renderInlineMarkdown('A **bold** and *italic* run.');
    expect(html).toBe('A <strong>bold</strong> and <em>italic</em> run.');
  });

  it('returns empty string for undefined', () => {
    expect(renderInlineMarkdown(undefined)).toBe('');
  });
});
