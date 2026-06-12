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
    expect(result).toEqual({
      tag: 'div',
      attrs: 'class="wrapper" data-testid="host"',
    });
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
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    expect(parseHostString('')).toBeNull();
    expect(parseHostString('button')).toBeNull();
    expect(parseHostString('not html')).toBeNull();
    warnSpy.mockRestore();
  });

  it('should extract text content from a tag-wrapped form', () => {
    expect(parseHostString('<button>Hover me</button>')).toEqual({
      tag: 'button',
      attrs: '',
      content: 'Hover me',
    });
  });

  it('should extract text content with attributes', () => {
    expect(parseHostString('<button class="demo">Click</button>')).toEqual({
      tag: 'button',
      attrs: 'class="demo"',
      content: 'Click',
    });
  });

  it('should support empty content for paired tags', () => {
    expect(parseHostString('<span></span>')).toEqual({
      tag: 'span',
      attrs: '',
      content: '',
    });
  });

  it('should reject mismatched closing tags', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    expect(parseHostString('<button>Hover</span>')).toBeNull();
    warnSpy.mockRestore();
  });

  it('should warn when a non-empty host string fails to parse', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    parseHostString('not html');
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('could not be parsed')
    );
    warnSpy.mockRestore();
  });

  it('should not warn for an empty string', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    parseHostString('');
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
