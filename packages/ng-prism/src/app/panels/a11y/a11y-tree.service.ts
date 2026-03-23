import { Injectable } from '@angular/core';
import {
  computeAccessibleName,
  extractStates,
  getRole,
  isHidden,
} from './a11y-dom-utils.js';
import type { A11yNode } from './a11y.types.js';

const PRESENTATIONAL_ROLES = new Set(['none', 'presentation']);

const STRUCTURAL_TAGS = new Set([
  'SCRIPT', 'STYLE', 'NOSCRIPT', 'META', 'LINK', 'TITLE', 'HEAD',
]);

@Injectable({ providedIn: 'root' })
export class A11yTreeService {
  buildTree(
    root: Element,
    getById?: (id: string) => Element | null,
  ): A11yNode {
    return buildNode(root, getById);
  }
}

function buildNode(
  element: Element,
  getById?: (id: string) => Element | null,
): A11yNode {
  const hidden = isHidden(element);
  const role = getRole(element);
  const states = extractStates(element);
  const { name, source } = computeAccessibleName(element, getById);

  const descId = element.getAttribute('aria-describedby');
  const description =
    descId && getById ? (getById(descId)?.textContent?.trim() ?? null) : null;

  const children: A11yNode[] = [];

  if (!hidden && !PRESENTATIONAL_ROLES.has(role)) {
    for (const child of Array.from(element.childNodes)) {
      if (child.nodeType === 1) {
        const childEl = child as Element;
        if (!STRUCTURAL_TAGS.has(childEl.tagName?.toUpperCase() ?? '')) {
          children.push(buildNode(childEl, getById));
        }
      }
    }
  }

  return {
    role: role || 'generic',
    name: name || null,
    nameSource: source !== 'none' ? source : null,
    description,
    states,
    children,
    hidden,
    element,
  };
}
