import { TestBed } from '@angular/core/testing';
import { PrismCaptureService } from '../services/prism-capture.service.js';
import {
  describeAll,
  renderCanvasChain,
  type CaptureDom,
} from './__fixtures__/capture-dom.js';

/**
 * What these tests would rather assert, and why they cannot.
 *
 * The failure this covers is geometric: a component taller than the canvas
 * viewport keeps a bounding box that extends past the canvas, and a screenshot
 * tool captures screen *coordinates*, so it picks up whichever shell region
 * paints there — a real baseline of a 200x201 component came back with the
 * panel's tab bar composited into its bottom 40px. The assertion that matches
 * that failure one-to-one is "`.demo-wrap`'s box lies inside the painted region
 * of `.prism-canvas-stage`", and jsdom cannot make it: it has no layout engine,
 * so every `getBoundingClientRect()` is `0x0` and the containment check would
 * pass vacuously today and forever. A real engine would need a browser runner,
 * and CI installs no browsers.
 *
 * So these assert the structural precondition instead: in capture mode nothing
 * beside the canvas's own ancestor chain occupies layout, which is exactly what
 * gives the canvas the space the geometric assertion needs. That is weaker in
 * kind but not in coverage of the regression — it fails today, for the same
 * reason the geometric one would.
 *
 * The geometry itself was verified once out of band, in Chromium against these
 * same stylesheets: with the rules in place a 200x400 component at a 1280x720
 * viewport goes from leaking 57px upwards into the variant ribbon and 121px
 * downwards into the panel to fully contained.
 */
function setSearch(search: string): void {
  window.history.replaceState({}, '', `/${search}`);
}

/**
 * The declared shell with capture mode's real stylesheet applied to it.
 *
 * Instantiating the service rather than pasting its rules in: the whole point
 * of the file is that the shipped stylesheet reaches the shipped DOM.
 */
function renderInCaptureMode(): CaptureDom {
  const dom = renderCanvasChain('light');
  setSearch('?capture=1');
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({});
  TestBed.inject(PrismCaptureService);
  return dom;
}

function occupiesLayout(el: Element): boolean {
  return getComputedStyle(el).display !== 'none';
}

/**
 * Everything that is neither the canvas nor one of its ancestors, level by
 * level from the stage up to the shell.
 */
function siblingsOfCanvasChain(dom: CaptureDom): Element[] {
  const siblings: Element[] = [];
  for (
    let node: Element = dom.stage;
    node.parentElement && node !== dom.shell;
    node = node.parentElement
  ) {
    for (const sibling of Array.from(node.parentElement.children)) {
      if (sibling !== node) siblings.push(sibling);
    }
  }
  return siblings;
}

describe('capture mode layout isolation', () => {
  afterEach(() => {
    setSearch('');
    document.documentElement.removeAttribute('data-prism-capture');
    document.head.querySelectorAll('style').forEach((el) => el.remove());
    document.getElementById('ng-prism-capture-styles')?.remove();
    document.body.innerHTML = '';
  });

  /**
   * The invariant: in capture mode, nothing outside the canvas may paint
   * within the capture target's box.
   *
   * Asserted over the shell's real nesting rather than over a list of chrome
   * selectors, because enumeration is what makes this class of bug recur. The
   * panel was added to the shell long after capture mode's promise was written
   * down, and nothing failed when it started compositing itself into
   * screenshots — the baselines were simply recorded with the contamination in
   * them and compared clean against themselves ever after. A region added
   * tomorrow fails here on the day it is added.
   */
  it('should leave nothing but the canvas chain occupying layout', () => {
    const dom = renderInCaptureMode();

    const siblings = siblingsOfCanvasChain(dom);

    // Guards against passing vacuously — the composed template has the panel,
    // the resizer row, the variant ribbon, the component head, the view tab
    // bar, the canvas toolbar, the sidebar and the header in it.
    expect(siblings.length).toBeGreaterThanOrEqual(8);
    expect(describeAll(siblings.filter(occupiesLayout))).toEqual([]);
  });

  it('should keep the canvas itself occupying layout', () => {
    const dom = renderInCaptureMode();

    // The mirror image: a rule that suppressed the canvas too would satisfy
    // the test above and produce an empty screenshot.
    const chain: Element[] = [];
    for (
      let node: Element = dom.stage;
      node !== dom.shell && node.parentElement;
      node = node.parentElement
    ) {
      chain.push(node);
    }
    expect(chain.length).toBeGreaterThanOrEqual(3);
    expect(describeAll(chain.filter((el) => !occupiesLayout(el)))).toEqual([]);
  });

  /**
   * The regression as it was actually found: panel chrome in a component
   * baseline.
   *
   * `display: none`, never `visibility: hidden`. Keeping the layout box is the
   * tempting minimal-churn fix and it does not work — the box still occupies
   * its space, so what paints at those coordinates becomes `.prism-main`'s own
   * background instead of the panel's tab bar, which is a screenshot that is
   * merely wrong in a different colour. The canvas is `flex: 1`; it has to
   * reclaim the space for the stage to paint there.
   */
  it('should give the panel and its resizer no layout box at all', () => {
    const { host } = renderInCaptureMode();

    for (const selector of ['.prism-main__panel', '.prism-resizer-row']) {
      const el = host.querySelector(selector);
      expect(el).not.toBeNull();
      expect(getComputedStyle(el as Element).display).toBe('none');
    }
  });

  /**
   * Capture mode's guarantee is about the canvas, so a view that has no canvas
   * has to come through untouched. Hiding the shell around a component page
   * would trade a contaminated screenshot for a blank one.
   */
  it('should leave a view without a canvas alone', () => {
    const dom = renderInCaptureMode();
    dom.host.querySelector('.prism-canvas-wrap')?.remove();

    const pageRenderer = dom.host.querySelector('prism-page-renderer');
    const sidebar = dom.host.querySelector('.prism-sidebar-wrap');
    expect(pageRenderer).not.toBeNull();
    expect(sidebar).not.toBeNull();
    expect(occupiesLayout(pageRenderer as Element)).toBe(true);
    expect(occupiesLayout(sidebar as Element)).toBe(true);
  });

  it('should drop the stage padding so the canvas is exactly the viewport', () => {
    const { stage } = renderInCaptureMode();

    // Not cosmetic: the stage is `height: 100%` under `content-box`, so its
    // padding lands outside that height — the stage overflows the row it sits
    // in by 64px and centres the component 32px below the centre of what is
    // actually painted. Measured: a 200x700 component at 1280x720 still leaks
    // 22px past the canvas with every region gone but the padding kept.
    expect(getComputedStyle(stage).padding).toBe('0px');
  });

  it('should strip the stage edge so it never lands in a screenshot', () => {
    const { stage } = renderInCaptureMode();

    // The edge is outline + box-shadow so that it stays out of layout and no
    // baseline moves when it changes. The flip side is that it still paints,
    // and `outline-offset: -1px` puts the line *inside* the border box — with
    // the padding above gone it sits flush against the component, so a
    // `.demo-wrap` that reaches the stage edge composites it into the PNG.
    // The transparency selector clears background colour and cannot reach it.
    const style = getComputedStyle(stage);
    // The shorthands, not the longhands: jsdom stores what the stylesheet
    // declared and never expands `outline` into `outline-style`.
    expect(style.outline).toBe('none');
    expect(style.boxShadow).toBe('none');
  });
});
