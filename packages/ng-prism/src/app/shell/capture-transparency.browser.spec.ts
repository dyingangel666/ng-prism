import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CAPTURE_TRANSPARENT_SELECTOR } from '../services/prism-capture.service.js';

const SHELL_SOURCE = join(__dirname, 'prism-shell.component.ts');
const RENDERER_SOURCE = join(
  __dirname,
  '..',
  'renderer',
  'prism-renderer.component.ts'
);

/**
 * The `template:` or `styles:` template literal of a component source file.
 *
 * A plain scan between the two backticks that follow the key. Neither literal
 * can contain a backtick of its own — one would terminate the literal and the
 * file would not compile — so there is nothing subtler to get right here.
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
 * The canvas DOM as the two components actually declare it.
 *
 * Built from the template sources rather than from a live render: the renderer
 * uses `viewChild.required` and the shell pulls in directives with
 * `input.required`, and initializer-based APIs do not survive this workspace's
 * JIT test compilation — the specs are transpiled by SWC, so nothing runs the
 * Angular compiler over them. Composing the templates keeps what this test is
 * actually about, the *nesting* and the *stylesheets*, and both of those are
 * declared statically.
 *
 * Angular control flow (`@if (…) { … }`) parses as text around elements that
 * still nest correctly, so conditional wrappers show up unconditionally. That
 * errs toward more ancestors, never fewer.
 */
function renderCanvasChain(): { stage: Element; demoWrap: Element } {
  const shell = readFileSync(SHELL_SOURCE, 'utf8');
  const renderer = readFileSync(RENDERER_SOURCE, 'utf8');

  const composed = literal(shell, 'template').replace(
    '<prism-renderer />',
    `<prism-renderer>${literal(renderer, 'template')}</prism-renderer>`
  );
  if (!composed.includes('demo-wrap')) {
    throw new Error('the renderer template was not spliced into the shell');
  }

  const style = document.createElement('style');
  style.textContent = `${literal(renderer, 'styles')}\n${literal(
    shell,
    'styles'
  )}`;
  document.head.appendChild(style);

  const host = document.createElement('div');
  host.innerHTML = composed;
  document.body.appendChild(host);

  const stage = host.querySelector('.prism-canvas-stage');
  const demoWrap = host.querySelector('.demo-wrap');
  if (!stage || !demoWrap) throw new Error('canvas markup not found');
  // `data-bg` is a binding, so the markup carries no value. Setting the one
  // the variant resolved to is exactly what the renderer does at runtime.
  stage.setAttribute('data-bg', 'transparent');
  document.documentElement.setAttribute('data-prism-capture', '');

  return { stage, demoWrap };
}

/**
 * Does any stylesheet in the document give this element a background?
 *
 * Deliberately asks whether a background is *declared*, never what colour it
 * resolves to. jsdom does not resolve `var()`, and every background in the
 * shell is a theme token — a `getComputedStyle` check would read `''` for all
 * of them and pass whether or not the feature works.
 *
 * `transparent` and `none` do not count as painting: they are what the
 * neutralising rule writes, and what a few pieces of chrome declare on purpose.
 */
function isPaintedByStylesheet(el: Element): boolean {
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRule[];
    try {
      rules = Array.from(sheet.cssRules);
    } catch {
      continue;
    }
    for (const rule of rules) {
      if (!(rule instanceof CSSStyleRule)) continue;
      const value = (
        rule.style.getPropertyValue('background-color') ||
        rule.style.getPropertyValue('background')
      ).trim();
      if (!value || value === 'transparent' || value === 'none') continue;
      if (matchesSafely(el, rule.selectorText)) return true;
    }
  }
  return false;
}

/** `matches()` throws on a selector jsdom cannot parse; those cannot match. */
function matchesSafely(el: Element, selector: string): boolean {
  try {
    return el.matches(selector);
  } catch {
    return false;
  }
}

/** Every element from `el`'s parent up to `<html>`, inclusive. */
function ancestorsToRoot(el: Element): Element[] {
  const chain: Element[] = [];
  for (let at = el.parentElement; at; at = at.parentElement) chain.push(at);
  return chain;
}

function describeAll(els: Element[]): string[] {
  return els.map(
    (el) => `${el.tagName.toLowerCase()}.${el.className || '(no class)'}`
  );
}

describe('capture mode with a transparent background', () => {
  afterEach(() => {
    document.documentElement.removeAttribute('data-prism-capture');
    document.head.querySelectorAll('style').forEach((el) => el.remove());
    document.body.innerHTML = '';
  });

  /**
   * The invariant, asserted against the declared DOM rather than against
   * `CAPTURE_TRANSPARENT_SELECTOR`'s own list of selectors.
   *
   * That list is the fragile part of transparent capture: rename a wrapper or
   * introduce a new painting layer and the capture silently goes opaque while
   * the screenshot still looks perfectly fine — nothing fails loudly, the
   * image just stops testing transparency. A test over the selectors would
   * only restate them. Walking the chain fails the moment a painting layer
   * appears that the list does not reach.
   */
  it('should leave no painted layer between the component and the document root', () => {
    const { demoWrap } = renderCanvasChain();

    const painted = ancestorsToRoot(demoWrap).filter(isPaintedByStylesheet);

    // Guards against passing vacuously. Four layers paint above the component
    // today — stage, canvas wrap, main, shell. If a refactor genuinely leaves
    // fewer, that is precisely when the selector list wants another look.
    expect(painted.length).toBeGreaterThanOrEqual(4);

    const unneutralised = painted.filter(
      (el) => !matchesSafely(el, CAPTURE_TRANSPARENT_SELECTOR)
    );
    expect(describeAll(unneutralised)).toEqual([]);
  });

  it('should leave every other background painting as it did', () => {
    const { stage, demoWrap } = renderCanvasChain();
    stage.setAttribute('data-bg', 'light');

    const painted = ancestorsToRoot(demoWrap).filter(isPaintedByStylesheet);

    // The mirror image of the test above: with any other declared background
    // the neutralising rule must reach nothing at all, or capture mode would
    // start dropping colours that `@Showcase({ bg })` asked for.
    expect(painted.length).toBeGreaterThanOrEqual(4);
    const neutralised = painted.filter((el) =>
      matchesSafely(el, CAPTURE_TRANSPARENT_SELECTOR)
    );
    expect(describeAll(neutralised)).toEqual([]);
  });
});
