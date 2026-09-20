/**
 * Turns per-variant `content` into the `projectableNodes` argument of
 * `ViewContainerRef.createComponent`.
 *
 * Shared by the Playground stage and the Overview cells: both project the same
 * developer-authored content, and the slot-selector handling is the one piece
 * of that neither wants to own twice.
 */

// SAFETY: `content` originates from `@Showcase({ variants: [{ content }] })`
// in developer-authored source code. It is trusted by ng-prism's threat model
// (see SECURITY.md). Sanitization would strip the Angular component/directive
// selectors that variant content is meant to project.
export function parseContentToNodes(
  content: string | Record<string, string>
): Node[][] {
  if (typeof content === 'string') {
    return [htmlToNodes(content)];
  }

  const defaultNodes = content['default']
    ? htmlToNodes(content['default'])
    : [];
  const result: Node[][] = [defaultNodes];

  for (const [selector, html] of Object.entries(content)) {
    if (selector === 'default') continue;
    const wrapper = document.createElement('div');
    // SAFETY: trusted developer-authored HTML — see SECURITY.md.
    wrapper.innerHTML = html;
    const nodes: Node[] = [];
    for (const child of Array.from(wrapper.childNodes)) {
      const el = document.createElement('div');
      // SAFETY: trusted developer-authored HTML — see SECURITY.md.
      el.innerHTML = (child as Element).outerHTML ?? child.textContent ?? '';
      const projected = el.firstChild;
      if (projected && projected instanceof Element) {
        applySelector(projected, selector);
        nodes.push(projected);
      } else if (projected) {
        const span = document.createElement('span');
        applySelector(span, selector);
        span.textContent = child.textContent;
        nodes.push(span);
      }
    }
    result.push(nodes);
  }

  return result;
}

// SAFETY: see `parseContentToNodes` above and SECURITY.md — `html` is trusted
// developer-authored variant content from the `@Showcase` decorator.
function htmlToNodes(html: string): Node[] {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = html;
  return Array.from(wrapper.childNodes);
}

function applySelector(el: Element, selector: string): void {
  const attrMatch = selector.match(/^\[([^\]=]+)]$/);
  if (attrMatch) {
    el.setAttribute(attrMatch[1], '');
  }
}
