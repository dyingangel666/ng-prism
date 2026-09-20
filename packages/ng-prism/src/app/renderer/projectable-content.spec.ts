/**
 * @jest-environment jsdom
 */

import { parseContentToNodes } from './projectable-content.js';

describe('parseContentToNodes', () => {
  it('returns a single default slot for string content', () => {
    const slots = parseContentToNodes('<span>Hello</span>');

    expect(slots).toHaveLength(1);
    expect((slots[0][0] as Element).outerHTML).toBe('<span>Hello</span>');
  });

  it('puts the "default" key of a record into the first slot', () => {
    const slots = parseContentToNodes({ default: '<b>Body</b>' });

    expect((slots[0][0] as Element).tagName).toBe('B');
  });

  it('applies an attribute selector to named slot content', () => {
    const slots = parseContentToNodes({ '[card-header]': '<h3>Title</h3>' });

    expect(slots[0]).toHaveLength(0);
    const projected = slots[1][0] as Element;
    expect(projected.tagName).toBe('H3');
    expect(projected.hasAttribute('card-header')).toBe(true);
  });

  it('wraps bare text for a named slot in a span carrying the selector', () => {
    const slots = parseContentToNodes({ '[card-footer]': 'Footer' });

    const projected = slots[1][0] as Element;
    expect(projected.tagName).toBe('SPAN');
    expect(projected.textContent).toBe('Footer');
    expect(projected.hasAttribute('card-footer')).toBe(true);
  });

  it('keeps default and named slots in separate arrays', () => {
    const slots = parseContentToNodes({
      default: 'Body',
      '[card-header]': '<h3>Title</h3>',
    });

    expect(slots).toHaveLength(2);
    expect(slots[0][0].textContent).toBe('Body');
    expect((slots[1][0] as Element).tagName).toBe('H3');
  });
});
