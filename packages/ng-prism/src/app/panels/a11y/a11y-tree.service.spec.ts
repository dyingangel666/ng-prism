import { A11yTreeService } from './a11y-tree.service.js';

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
  const text = children
    .map((c) => c.textContent)
    .join('');
  return {
    nodeType: ELEMENT_NODE,
    tagName: tag.toUpperCase(),
    getAttribute: (name: string) => attrs[name] ?? null,
    hasAttribute: (name: string) => name in attrs,
    textContent: text || attrs['aria-label'] || '',
    childNodes: children,
  };
}

describe('A11yTreeService', () => {
  let service: A11yTreeService;

  beforeEach(() => {
    service = new A11yTreeService();
  });

  it('assigns role from tag', () => {
    const root = el('button', {}, [textNode('Click me')]);
    const node = service.buildTree(root as unknown as Element);
    expect(node.role).toBe('button');
  });

  it('assigns explicit role from attribute', () => {
    const root = el('div', { role: 'dialog' });
    const node = service.buildTree(root as unknown as Element);
    expect(node.role).toBe('dialog');
  });

  it('uses generic role for elements without role', () => {
    const root = el('div');
    const node = service.buildTree(root as unknown as Element);
    expect(node.role).toBe('generic');
  });

  it('extracts name from aria-label', () => {
    const root = el('input', { 'aria-label': 'Search' });
    const node = service.buildTree(root as unknown as Element);
    expect(node.name).toBe('Search');
    expect(node.nameSource).toBe('aria-label');
  });

  it('extracts name from text content', () => {
    const root = el('button', {}, [textNode('Submit')]);
    const node = service.buildTree(root as unknown as Element);
    expect(node.name).toBe('Submit');
    expect(node.nameSource).toBe('text-content');
  });

  it('sets name to null when no name found', () => {
    const root = el('div');
    const node = service.buildTree(root as unknown as Element);
    expect(node.name).toBeNull();
  });

  it('builds children recursively', () => {
    const child = el('button', {}, [textNode('OK')]);
    const root = el('div', {}, [child]);
    const node = service.buildTree(root as unknown as Element);
    expect(node.children).toHaveLength(1);
    expect(node.children[0].role).toBe('button');
  });

  it('marks aria-hidden elements as hidden', () => {
    const root = el('div', { 'aria-hidden': 'true' });
    const node = service.buildTree(root as unknown as Element);
    expect(node.hidden).toBe(true);
  });

  it('marks elements with hidden attribute as hidden', () => {
    const root = el('div', { hidden: '' });
    const node = service.buildTree(root as unknown as Element);
    expect(node.hidden).toBe(true);
  });

  it('does not recurse into hidden elements', () => {
    const hidden = el('div', { 'aria-hidden': 'true' }, [
      el('button', {}, [textNode('Hidden btn')]),
    ]);
    const node = service.buildTree(hidden as unknown as Element);
    expect(node.children).toHaveLength(0);
  });

  it('extracts required state', () => {
    const root = el('input', { required: '' });
    const node = service.buildTree(root as unknown as Element);
    expect(node.states['required']).toBe(true);
  });

  it('extracts aria-expanded state', () => {
    const root = el('button', { 'aria-expanded': 'true' }, [textNode('Menu')]);
    const node = service.buildTree(root as unknown as Element);
    expect(node.states['expanded']).toBe(true);
  });

  it('extracts heading level', () => {
    const root = el('h2', {}, [textNode('Section title')]);
    const node = service.buildTree(root as unknown as Element);
    expect(node.states['level']).toBe('2');
  });

  it('skips script and style tags', () => {
    const script = el('script', {}, [textNode('console.log(1)')]);
    const style = el('style', {}, [textNode('body {}')]);
    const root = el('div', {}, [script, style, el('button', {}, [textNode('OK')])]);
    const node = service.buildTree(root as unknown as Element);

    const roles = node.children.map((c) => c.role);
    expect(roles).not.toContain('script');
    expect(roles).toContain('button');
    expect(node.children).toHaveLength(1);
  });

  it('stores the original element reference', () => {
    const root = el('button', {}, [textNode('Click')]);
    const node = service.buildTree(root as unknown as Element);
    expect(node.element).toBe(root);
  });
});
