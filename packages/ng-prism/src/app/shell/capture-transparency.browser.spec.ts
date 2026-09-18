import { CAPTURE_TRANSPARENT_SELECTOR } from '../services/prism-capture.service.js';
import {
  describeAll,
  matchesSafely,
  renderCanvasChain,
} from './__fixtures__/capture-dom.js';

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

/** Every element from `el`'s parent up to `<html>`, inclusive. */
function ancestorsToRoot(el: Element): Element[] {
  const chain: Element[] = [];
  for (let at = el.parentElement; at; at = at.parentElement) chain.push(at);
  return chain;
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

  it('should walk through the bootstrapped host element, not only the div inside it', () => {
    const { host, demoWrap } = renderCanvasChain();

    // The app bootstraps `<prism-shell>`; the template's `div.prism-shell`
    // lives inside it. Mounting the template in a bare wrapper left the outer
    // element out of the chain, and `:host { background }` on the shell — the
    // easiest painting layer to add by accident — is declared on exactly that
    // element. The walk has to see it and the selector has to reach it.
    expect(host.tagName.toLowerCase()).toBe('prism-shell');
    expect(ancestorsToRoot(demoWrap)).toContain(host);
    expect(matchesSafely(host, CAPTURE_TRANSPARENT_SELECTOR)).toBe(true);
  });

  it('should leave every other background painting as it did', () => {
    const { demoWrap } = renderCanvasChain('light');

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
