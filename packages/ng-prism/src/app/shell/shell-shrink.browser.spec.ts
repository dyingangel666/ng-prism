import { renderCanvasChain } from './__fixtures__/capture-dom.js';

/**
 * What these tests would rather assert, and why they cannot.
 *
 * The failure is geometric: at a 500px viewport the shell's own column track
 * measured 763px, so the canvas never went below 415px however far the window
 * was dragged in, and `overflow: hidden` on the shell clipped the difference
 * rather than letting anything reflow. Nothing responsive inside a showcased
 * component could be reached, which is a styleguide that cannot show what it
 * is for. The assertion matching that one-to-one is "the shell's box never
 * exceeds the viewport", and jsdom cannot make it: it has no layout engine, so
 * every measurement comes back 0x0 and the check would pass vacuously.
 *
 * So these assert the two declarations the reflow rests on instead. Both are
 * readable from the shipped stylesheet through the shipped DOM, and both fail
 * the moment the behaviour regresses.
 *
 * The geometry itself was verified out of band, in Chromium against these same
 * stylesheets: at a 500px viewport the shell went from 763px to 500px, the
 * canvas from 415px to 281px, and a component that stacks below 320px started
 * stacking.
 */
describe('shell width', () => {
  afterEach(() => {
    document.head.querySelectorAll('style').forEach((el) => el.remove());
    document.body.innerHTML = '';
  });

  /**
   * The fix itself. An implicit track is `auto`, and an `auto` track takes the
   * min-content width of its contents as its minimum — the whole body, in this
   * one case. Declaring the track is the only way to give it a zero floor.
   */
  it('should give its column a zero minimum so the body can shrink', () => {
    const dom = renderCanvasChain('light');

    const columns = getComputedStyle(dom.shell).gridTemplateColumns;

    expect(columns).toBe('minmax(0, 1fr)');
  });

  /**
   * Why one track was enough.
   *
   * The levels below the shell declare bare `fr` tracks of their own, and they
   * get away with it because an item whose `overflow` is not `visible` has an
   * automatic minimum of zero — so `.prism-main` never imposes its min-content
   * width on the track holding it. Take that `overflow` away and the one-line
   * fix above silently stops being sufficient, with nothing else to catch it.
   */
  it('should keep the main region clipping, which is what zeroes its own minimum', () => {
    const dom = renderCanvasChain('light');
    const main = dom.host.querySelector('.prism-main');

    expect(main).not.toBeNull();
    expect(getComputedStyle(main as Element).overflow).not.toBe('visible');
  });
});
