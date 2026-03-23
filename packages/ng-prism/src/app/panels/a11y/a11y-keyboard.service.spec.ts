import { A11yKeyboardService } from './a11y-keyboard.service.js';

interface MockElement {
  tagName: string;
  nodeType: number;
  getAttribute(name: string): string | null;
  hasAttribute(name: string): boolean;
  textContent: string;
  querySelectorAll(selector: string): MockElement[];
  childNodes: MockElement[];
}

function el(
  tag: string,
  attrs: Record<string, string> = {},
  text = '',
  selectorResults: MockElement[] = [],
): MockElement {
  return {
    tagName: tag.toUpperCase(),
    nodeType: 1,
    getAttribute: (name: string) => attrs[name] ?? null,
    hasAttribute: (name: string) => name in attrs,
    textContent: text,
    querySelectorAll: (_: string) => selectorResults,
    childNodes: [],
  };
}

describe('A11yKeyboardService', () => {
  let service: A11yKeyboardService;

  beforeEach(() => {
    service = new A11yKeyboardService();
  });

  it('returns empty list when no focusable elements exist', () => {
    const root = el('div', {}, '', []);
    const result = service.extractTabOrder(root as unknown as Element);
    expect(result).toHaveLength(0);
  });

  it('assigns sequential 1-based index', () => {
    const btn1 = el('button', {}, 'First');
    const btn2 = el('button', {}, 'Second');
    const root = el('div', {}, '', [btn1, btn2]);

    const result = service.extractTabOrder(root as unknown as Element);
    expect(result[0].index).toBe(1);
    expect(result[1].index).toBe(2);
  });

  it('extracts role from tag', () => {
    const btn = el('button', {}, 'Click me');
    const root = el('div', {}, '', [btn]);

    const result = service.extractTabOrder(root as unknown as Element);
    expect(result[0].role).toBe('button');
  });

  it('extracts name from aria-label', () => {
    const input = el('input', { 'aria-label': 'Email address' });
    const root = el('div', {}, '', [input]);

    const result = service.extractTabOrder(root as unknown as Element);
    expect(result[0].name).toBe('Email address');
    expect(result[0].nameSource).toBe('aria-label');
  });

  it('extracts name from text content for buttons', () => {
    const btn = el('button', {}, 'Submit form');
    const root = el('div', {}, '', [btn]);

    const result = service.extractTabOrder(root as unknown as Element);
    expect(result[0].name).toBe('Submit form');
    expect(result[0].nameSource).toBe('text-content');
  });

  it('puts positive tabindex elements before natural order', () => {
    const natBtn = el('button', {}, 'Natural');
    const posBtn = el('button', { tabindex: '2' }, 'Explicit');
    const root = el('div', {}, '', [natBtn, posBtn]);

    const result = service.extractTabOrder(root as unknown as Element);
    expect(result[0].element).toBe(posBtn);
    expect(result[1].element).toBe(natBtn);
  });

  it('sorts multiple positive tabindex values ascending', () => {
    const btn3 = el('button', { tabindex: '3' }, 'Third');
    const btn1 = el('button', { tabindex: '1' }, 'First');
    const btn2 = el('button', { tabindex: '2' }, 'Second');
    const root = el('div', {}, '', [btn3, btn1, btn2]);

    const result = service.extractTabOrder(root as unknown as Element);
    expect(result[0].element).toBe(btn1);
    expect(result[1].element).toBe(btn2);
    expect(result[2].element).toBe(btn3);
  });

  it('detects required state', () => {
    const input = el('input', { required: '' });
    const root = el('div', {}, '', [input]);

    const result = service.extractTabOrder(root as unknown as Element);
    expect(result[0].states).toContain('required');
  });

  it('detects aria-required state', () => {
    const input = el('input', { 'aria-required': 'true' });
    const root = el('div', {}, '', [input]);

    const result = service.extractTabOrder(root as unknown as Element);
    expect(result[0].states).toContain('required');
  });

  it('detects expanded state', () => {
    const btn = el('button', { 'aria-expanded': 'true' }, 'Menu');
    const root = el('div', {}, '', [btn]);

    const result = service.extractTabOrder(root as unknown as Element);
    expect(result[0].states).toContain('expanded');
  });

  it('stores the original element reference', () => {
    const btn = el('button', {}, 'Click');
    const root = el('div', {}, '', [btn]);

    const result = service.extractTabOrder(root as unknown as Element);
    expect(result[0].element).toBe(btn);
  });

  it('stores explicit tabindex value', () => {
    const btn = el('button', { tabindex: '5' }, 'Btn');
    const root = el('div', {}, '', [btn]);

    const result = service.extractTabOrder(root as unknown as Element);
    expect(result[0].tabindex).toBe(5);
  });

  it('stores null tabindex for elements without explicit tabindex', () => {
    const btn = el('button', {}, 'Btn');
    const root = el('div', {}, '', [btn]);

    const result = service.extractTabOrder(root as unknown as Element);
    expect(result[0].tabindex).toBeNull();
  });
});
