import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const SHELL_SOURCE = join(__dirname, '..', 'prism-shell.component.ts');
const RENDERER_SOURCE = join(
  __dirname,
  '..',
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
 *
 * `styles` may be a single literal (`styles: \`…\``) or, as of the renderer's
 * shared `[data-bg]` rules, an array whose first element is the literal
 * (`styles: [\n    \`…\`,`). Anchoring on the key alone rather than on the key
 * plus an immediately-following backtick covers both: this only ever returns
 * the *first* literal, which is exactly the one these fixtures compose — the
 * base stage rules, not the shared `CANVAS_BG_STYLES` appended after it.
 */
export function literal(source: string, key: 'template' | 'styles'): string {
  const keyAt = source.indexOf(`${key}:`);
  if (keyAt === -1) throw new Error(`no ${key} literal in component source`);
  const open = source.indexOf('`', keyAt);
  const close = source.indexOf('`', open + 1);
  if (close === -1) throw new Error(`unterminated ${key} literal`);
  return source.slice(open + 1, close);
}

/**
 * `<prism-foo />` written out as `<prism-foo></prism-foo>`.
 *
 * Angular's parser honours self-closing syntax on any element; the HTML parser
 * honours it on none but the void elements. Feeding a template straight to
 * `innerHTML` therefore makes every unknown element swallow its followers as
 * children — `<prism-view-tab-bar />` ends up the *ancestor* of the component
 * head, the variant ribbon and the canvas, instead of their sibling. That
 * inverts the one relationship these fixtures exist to describe, so it is
 * normalised away before parsing rather than reasoned around afterwards.
 *
 * Void elements (`<img />`, SVG `<path />`) pick up a closing tag they do not
 * need, which the parser discards. No attribute value can contain `/>`: the
 * only candidate in the shell is a base64 `src`, and `>` is not in the base64
 * alphabet.
 */
function expandSelfClosing(template: string): string {
  return template.replace(/<([a-z][a-z0-9-]*)([^<>]*?)\s*\/>/g, '<$1$2></$1>');
}

/** The `selector:` of a component source, e.g. `prism-shell`. */
function selectorOf(source: string): string {
  const match = /selector:\s*'([^']+)'/.exec(source);
  if (!match) throw new Error('no selector in component source');
  return match[1];
}

/**
 * `:host` rewritten to the element the component mounts on.
 *
 * Angular resolves `:host` against the host element; nothing does that here,
 * so a `:host` rule would simply never match and a background declared there
 * would be invisible to every assertion. Scoped per source rather than
 * globally — the shell's `:host` and the renderer's are different elements.
 */
function scopeHost(styles: string, selector: string): string {
  return styles.replace(/:host\b/g, selector);
}

export interface CaptureDom {
  /** The shell's own host element — the one the app bootstraps. */
  host: HTMLElement;
  shell: Element;
  stage: Element;
  demoWrap: Element;
}

/**
 * The canvas DOM as the shell and the renderer actually declare it.
 *
 * Built from the template sources rather than from a live render: the renderer
 * uses `viewChild.required` and the shell pulls in directives with
 * `input.required`, and initializer-based APIs do not survive this workspace's
 * JIT test compilation — the specs are transpiled by SWC, so nothing runs the
 * Angular compiler over them. Composing the templates keeps what these tests
 * are actually about, the *nesting* and the *stylesheets*, and both of those
 * are declared statically.
 *
 * Angular control flow (`@if (…) { … }`) parses as text around elements that
 * still nest correctly, so conditional regions show up unconditionally: the
 * canvas, the page renderer and the view panel host are all siblings here
 * where a real render shows one of them. That errs toward more siblings, never
 * fewer — every assertion built on this sees at least the DOM a real render
 * produces.
 */
export function renderCanvasChain(bg = 'transparent'): CaptureDom {
  const shellSource = readFileSync(SHELL_SOURCE, 'utf8');
  const rendererSource = readFileSync(RENDERER_SOURCE, 'utf8');

  const composed = expandSelfClosing(
    literal(shellSource, 'template').replace(
      '<prism-renderer />',
      `<prism-renderer>${literal(rendererSource, 'template')}</prism-renderer>`
    )
  );
  if (!composed.includes('demo-wrap')) {
    throw new Error('the renderer template was not spliced into the shell');
  }

  const style = document.createElement('style');
  style.textContent = [
    scopeHost(literal(rendererSource, 'styles'), selectorOf(rendererSource)),
    scopeHost(literal(shellSource, 'styles'), selectorOf(shellSource)),
  ].join('\n');
  document.head.appendChild(style);

  // The real host element, not a bare `<div>`. The app bootstraps
  // `<prism-shell>` and the template's `div.prism-shell` lives *inside* it, so
  // a wrapper of any other name would drop a layer out of the chain these
  // fixtures exist to describe — and a `:host` background added to the shell
  // would then paint above a capture without a single test noticing.
  const host = document.createElement(selectorOf(shellSource));
  host.innerHTML = composed;
  document.body.appendChild(host);

  const shell = host.querySelector('.prism-shell');
  const stage = host.querySelector('.prism-canvas-stage');
  const demoWrap = host.querySelector('.demo-wrap');
  const canvasWrap = host.querySelector('.prism-canvas-wrap');
  if (!shell || !stage || !demoWrap || !canvasWrap) {
    throw new Error('canvas markup not found');
  }

  // The canvas tool rail, which the composed template does not carry: it is
  // declared inside `prism-canvas-toolbar`, and only the renderer's template is
  // spliced in above. Its host is `display: contents`, so the rail is a child
  // of `.prism-canvas-wrap` in layout terms — precisely the position capture
  // mode's structural rule exists to catch, and precisely the position a rail
  // moved into the renderer or the stage would lose. Added at that level rather
  // than under a `prism-canvas-toolbar` element so the level-by-level walk in
  // `capture-layout.browser.spec.ts` asserts the rail itself: jsdom computes no
  // inherited `display`, so an element nested one level deeper would be visited
  // by nothing and prove nothing.
  const toolrail = document.createElement('div');
  toolrail.className = 'prism-toolrail';
  canvasWrap.appendChild(toolrail);

  // `data-bg` is a binding, so the markup carries no value. Setting the one
  // the variant resolved to is exactly what the renderer does at runtime.
  stage.setAttribute('data-bg', bg);
  document.documentElement.setAttribute('data-prism-capture', '');

  return { host, shell, stage, demoWrap };
}

/** `matches()` throws on a selector jsdom cannot parse; those cannot match. */
export function matchesSafely(el: Element, selector: string): boolean {
  try {
    return el.matches(selector);
  } catch {
    return false;
  }
}

export function describeAll(els: Element[]): string[] {
  return els.map(
    (el) => `${el.tagName.toLowerCase()}.${el.className || '(no class)'}`
  );
}
