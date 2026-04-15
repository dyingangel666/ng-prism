import { parseHostString } from './host-parser.js';

describe('parseHostString', () => {
  it('should parse a simple element tag', () => {
    const result = parseHostString('<button>');
    expect(result).toEqual({ tag: 'button', attrs: '' });
  });

  it('should parse an element with a class attribute', () => {
    const result = parseHostString('<span class="demo-text">');
    expect(result).toEqual({ tag: 'span', attrs: 'class="demo-text"' });
  });

  it('should parse an element with multiple attributes', () => {
    const result = parseHostString('<div class="wrapper" data-testid="host">');
    expect(result).toEqual({ tag: 'div', attrs: 'class="wrapper" data-testid="host"' });
  });

  it('should handle self-closing tags', () => {
    const result = parseHostString('<input />');
    expect(result).toEqual({ tag: 'input', attrs: '' });
  });

  it('should handle self-closing tags with attributes', () => {
    const result = parseHostString('<input type="text" />');
    expect(result).toEqual({ tag: 'input', attrs: 'type="text"' });
  });

  it('should trim whitespace', () => {
    const result = parseHostString('  <button>  ');
    expect(result).toEqual({ tag: 'button', attrs: '' });
  });

  it('should return null for invalid input', () => {
    expect(parseHostString('')).toBeNull();
    expect(parseHostString('button')).toBeNull();
    expect(parseHostString('not html')).toBeNull();
  });
});
