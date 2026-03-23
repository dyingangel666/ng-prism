import { Injectable } from '@angular/core';
import { computeAccessibleName, getRole } from './a11y-dom-utils.js';
import type { FocusableElement } from './a11y.types.js';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(', ');

function getTabindex(element: Element): number {
  const attr = element.getAttribute('tabindex');
  if (attr === null) return 0;
  return parseInt(attr, 10);
}

function sortByTabOrder(elements: Element[]): Element[] {
  const positive = elements.filter((el) => getTabindex(el) > 0);
  const natural = elements.filter((el) => getTabindex(el) === 0);

  positive.sort((a, b) => getTabindex(a) - getTabindex(b));

  return [...positive, ...natural];
}

@Injectable({ providedIn: 'root' })
export class A11yKeyboardService {
  extractTabOrder(
    root: Element,
    getById?: (id: string) => Element | null,
  ): FocusableElement[] {
    const found = Array.from(root.querySelectorAll(FOCUSABLE_SELECTOR));
    const sorted = sortByTabOrder(found);

    return sorted.map((element, i) => {
      const { name, source } = computeAccessibleName(element, getById);
      const role = getRole(element);
      const states = extractFocusableStates(element);
      const tabindex = element.getAttribute('tabindex');

      return {
        element,
        index: i + 1,
        role,
        name,
        nameSource: source,
        states,
        tabindex: tabindex !== null ? parseInt(tabindex, 10) : null,
      };
    });
  }
}

function extractFocusableStates(element: Element): string[] {
  const states: string[] = [];
  if (element.getAttribute('aria-required') === 'true' || element.hasAttribute('required')) {
    states.push('required');
  }
  if (element.getAttribute('aria-disabled') === 'true') {
    states.push('disabled');
  }
  const checked = element.getAttribute('aria-checked');
  if (checked === 'true') states.push('checked');
  if (checked === 'false') states.push('unchecked');
  const expanded = element.getAttribute('aria-expanded');
  if (expanded === 'true') states.push('expanded');
  if (expanded === 'false') states.push('collapsed');
  return states;
}
