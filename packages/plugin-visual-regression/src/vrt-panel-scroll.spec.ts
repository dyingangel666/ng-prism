/**
 * @jest-environment jsdom
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const PANEL_SOURCE = join(__dirname, 'visual-regression-panel.component.ts');

/**
 * The `template:` or `styles:` template literal of a component source file.
 *
 * Read from source rather than from a rendered component: the panel declares
 * `input()`, and initializer-based APIs do not survive this workspace's JIT
 * test compilation — the specs go through SWC, so nothing runs the Angular
 * compiler over them. Neither literal can contain a backtick of its own (one
 * would end the literal and the file would not compile), so the scan between
 * the two backticks after the key is exact.
 */
function literal(source: string, key: 'template' | 'styles'): string {
  const keyAt = source.indexOf(`${key}: \``);
  if (keyAt === -1) throw new Error(`no ${key} literal in component source`);
  const open = source.indexOf('`', keyAt);
  const close = source.indexOf('`', open + 1);
  if (close === -1) throw new Error(`unterminated ${key} literal`);
  return source.slice(open + 1, close);
}

/**
 * The panel's own markup and stylesheet, mounted for real.
 *
 * `:host` has no element here, so it is rewritten to the wrapper the markup
 * actually hangs off — that is the only substitution, and it keeps the host's
 * declarations in the cascade where the test can read them.
 */
function mountPanel(): { host: HTMLElement } {
  const source = readFileSync(PANEL_SOURCE, 'utf8');

  const style = document.createElement('style');
  style.textContent = literal(source, 'styles').replace(
    /:host\b/g,
    '.vrt-host'
  );
  document.head.appendChild(style);

  const host = document.createElement('div');
  host.className = 'vrt-host';
  // The template's outermost element is wrapped in `@if` blocks, which parse
  // as text around it; the elements themselves still nest correctly.
  host.innerHTML = literal(source, 'template');
  document.body.appendChild(host);
  return { host };
}

function scrolls(el: Element | null): boolean {
  if (!el) throw new Error('element not found');
  const overflow = getComputedStyle(el).overflow;
  return overflow === 'auto' || overflow === 'scroll';
}

describe('visual regression panel scrolling', () => {
  afterEach(() => {
    document.head.querySelectorAll('style').forEach((el) => el.remove());
    document.body.innerHTML = '';
  });

  /**
   * The bug this pins: the panel used to be one scroll container, so both
   * columns simply grew inside it. Scrolling the variant list down scrolled
   * the comparison off the top, and picking a variant meant scrolling back up
   * to see what you had picked.
   *
   * Asserted as a property of the rendered elements rather than of the CSS
   * text, so it survives the rules being rewritten and fails if a refactor
   * hands the scrolling back to the host.
   */
  it('should give the list and the viewer a scroll container each, and not the host', () => {
    const { host } = mountPanel();

    expect(scrolls(host.querySelector('.vrt__list'))).toBe(true);
    expect(scrolls(host.querySelector('.vrt__viewer'))).toBe(true);
    expect(scrolls(host)).toBe(false);
  });

  /**
   * The half of the fix that is easy to drop in a later edit.
   *
   * A grid or flex item defaults to `min-height: auto` and refuses to shrink
   * below its content: without an explicit `min-height: 0` on every link of
   * the chain, the columns grow past the panel and push the overflow back up
   * to the host — which looks exactly like the original bug, with the
   * `overflow` rules still correctly in place.
   */
  it('should let every column shrink below its content', () => {
    const { host } = mountPanel();

    for (const selector of [
      '.vrt',
      '.vrt__aside',
      '.vrt__list',
      '.vrt__viewer',
    ]) {
      const el = host.querySelector(selector);
      if (!el) throw new Error(`${selector} not found`);
      // Paired with the selector so a failure names the link that broke; the
      // unit is open because jsdom reports a bare `0` where a browser says
      // `0px`, and an unset property comes back as the empty string either way.
      expect([selector, getComputedStyle(el).minHeight]).toEqual([
        selector,
        expect.stringMatching(/^0(px)?$/),
      ]);
    }
  });

  /** The summary belongs to the list column, never above both of them. */
  it('should keep the summary inside the aside, not across the panel', () => {
    const { host } = mountPanel();

    const summary = host.querySelector('.vrt__summary');
    expect(summary).not.toBeNull();
    expect(summary!.closest('.vrt__aside')).not.toBeNull();
  });
});
