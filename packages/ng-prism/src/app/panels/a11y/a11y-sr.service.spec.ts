import { A11ySrService } from './a11y-sr.service.js';

const ELEMENT_NODE = 1;
const TEXT_NODE = 3;

interface MockNode {
  nodeType: number;
  tagName?: string;
  textContent: string;
  getAttribute(name: string): string | null;
  hasAttribute(name: string): boolean;
  childNodes: MockNode[];
}

function textNode(content: string): MockNode {
  return {
    nodeType: TEXT_NODE,
    textContent: content,
    getAttribute: () => null,
    hasAttribute: () => false,
    childNodes: [],
  };
}

function el(
  tag: string,
  attrs: Record<string, string> = {},
  children: MockNode[] = [],
): MockNode {
  const text = children.map((c) => c.textContent).join('');
  return {
    nodeType: ELEMENT_NODE,
    tagName: tag.toUpperCase(),
    getAttribute: (name: string) => attrs[name] ?? null,
    hasAttribute: (name: string) => name in attrs,
    textContent: text || attrs['aria-label'] || '',
    childNodes: children,
  };
}

describe('A11ySrService', () => {
  let service: A11ySrService;

  beforeEach(() => {
    service = new A11ySrService();
  });

  it('returns empty list for element with no announced roles', () => {
    const root = el('div', {}, [el('span')]);
    const result = service.buildAnnouncementList(root as unknown as Element);
    expect(result).toHaveLength(0);
  });

  it('announces a button', () => {
    const root = el('button', {}, [textNode('Submit')]);
    const result = service.buildAnnouncementList(root as unknown as Element);
    expect(result).toHaveLength(1);
    expect(result[0].role).toBe('button');
    expect(result[0].name).toBe('Submit');
  });

  it('includes name in announcement text', () => {
    const root = el('button', {}, [textNode('Submit form')]);
    const result = service.buildAnnouncementList(root as unknown as Element);
    expect(result[0].text).toContain('"Submit form"');
    expect(result[0].text).toContain('button');
  });

  it('announces links', () => {
    const root = el('a', { href: '#' }, [textNode('Learn more')]);
    const result = service.buildAnnouncementList(root as unknown as Element);
    expect(result[0].role).toBe('link');
    expect(result[0].name).toBe('Learn more');
  });

  it('announces text fields', () => {
    const root = el('input', { 'aria-label': 'Email' });
    const result = service.buildAnnouncementList(root as unknown as Element);
    expect(result[0].role).toBe('text field');
    expect(result[0].name).toBe('Email');
  });

  it('announces headings with level', () => {
    const root = el('h2', {}, [textNode('Section title')]);
    const result = service.buildAnnouncementList(root as unknown as Element);
    expect(result[0].role).toBe('heading');
    expect(result[0].text).toContain('level 2');
  });

  it('includes required state in announcement', () => {
    const root = el('input', { 'aria-label': 'Email', required: '' });
    const result = service.buildAnnouncementList(root as unknown as Element);
    expect(result[0].states).toContain('required');
    expect(result[0].text).toContain('required');
  });

  it('assigns sequential 1-based indices', () => {
    const root = el('div', {}, [
      el('button', {}, [textNode('First')]),
      el('button', {}, [textNode('Second')]),
      el('button', {}, [textNode('Third')]),
    ]);
    const result = service.buildAnnouncementList(root as unknown as Element);
    expect(result.map((r) => r.index)).toEqual([1, 2, 3]);
  });

  it('skips aria-hidden elements', () => {
    const root = el('div', {}, [
      el('button', {}, [textNode('Visible')]),
      el('button', { 'aria-hidden': 'true' }, [textNode('Hidden')]),
    ]);
    const result = service.buildAnnouncementList(root as unknown as Element);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Visible');
  });

  it('traverses through div and span wrappers', () => {
    const root = el('div', {}, [
      el('div', {}, [
        el('span', {}, [
          el('button', {}, [textNode('Click me')]),
        ]),
      ]),
    ]);
    const result = service.buildAnnouncementList(root as unknown as Element);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Click me');
  });

  it('announces list and list items', () => {
    const root = el('ul', {}, [
      el('li', {}, [textNode('Item 1')]),
      el('li', {}, [textNode('Item 2')]),
    ]);
    const result = service.buildAnnouncementList(root as unknown as Element);

    const roles = result.map((r) => r.role);
    expect(roles).toContain('list');
    expect(roles).toContain('list item');
  });

  it('announces navigation landmark', () => {
    const root = el('nav', { 'aria-label': 'Main' }, [
      el('a', { href: '#' }, [textNode('Home')]),
    ]);
    const result = service.buildAnnouncementList(root as unknown as Element);
    expect(result[0].role).toBe('navigation');
    expect(result[0].name).toBe('Main');
  });

  it('announces checkbox with checked state', () => {
    const root = el('input', { type: 'checkbox', 'aria-label': 'Accept terms', 'aria-checked': 'true' });
    const result = service.buildAnnouncementList(root as unknown as Element);
    expect(result[0].role).toBe('checkbox');
    expect(result[0].states).toContain('checked: true');
  });

  it('stores element reference', () => {
    const btn = el('button', {}, [textNode('OK')]);
    const root = btn;
    const result = service.buildAnnouncementList(root as unknown as Element);
    expect(result[0].element).toBe(btn);
  });
});
