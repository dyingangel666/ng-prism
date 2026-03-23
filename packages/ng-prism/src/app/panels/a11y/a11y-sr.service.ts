import { Injectable } from '@angular/core';
import {
  computeAccessibleName,
  extractStates,
  getRole,
  isHidden,
  statesToList,
} from './a11y-dom-utils.js';
import type { SrAnnouncement } from './a11y.types.js';

const ROLE_LABELS: Record<string, string> = {
  button: 'button',
  link: 'link',
  textbox: 'text field',
  searchbox: 'search field',
  checkbox: 'checkbox',
  radio: 'radio button',
  listbox: 'list box',
  slider: 'slider',
  spinbutton: 'spin button',
  combobox: 'combo box',
  heading: 'heading',
  list: 'list',
  listitem: 'list item',
  navigation: 'navigation',
  main: 'main',
  banner: 'banner',
  contentinfo: 'content info',
  complementary: 'complementary',
  form: 'form',
  dialog: 'dialog',
  table: 'table',
  row: 'row',
  columnheader: 'column header',
  cell: 'cell',
  img: 'image',
  region: 'region',
  article: 'article',
  group: 'group',
};

const ANNOUNCED_ROLES = new Set(Object.keys(ROLE_LABELS));

const STRUCTURAL_TAGS = new Set([
  'SCRIPT', 'STYLE', 'NOSCRIPT', 'META', 'LINK', 'TITLE', 'HEAD',
  'DIV', 'SPAN',
]);

@Injectable({ providedIn: 'root' })
export class A11ySrService {
  buildAnnouncementList(
    root: Element,
    getById?: (id: string) => Element | null,
  ): SrAnnouncement[] {
    const announcements: SrAnnouncement[] = [];
    walk(root, announcements, getById);
    announcements.forEach((a, i) => {
      a.index = i + 1;
    });
    return announcements;
  }
}

function walk(
  element: Element,
  out: SrAnnouncement[],
  getById?: (id: string) => Element | null,
): void {
  if (isHidden(element)) return;

  const tag = element.tagName?.toUpperCase() ?? '';
  if (STRUCTURAL_TAGS.has(tag) && !element.getAttribute('role')) {
    for (const child of Array.from(element.childNodes)) {
      if (child.nodeType === 1) walk(child as Element, out, getById);
    }
    return;
  }

  const role = getRole(element);

  if (ANNOUNCED_ROLES.has(role)) {
    const { name } = computeAccessibleName(element, getById);
    const states = extractStates(element);
    const stateList = statesToList(states);

    const roleLabel = ROLE_LABELS[role] ?? role;

    let levelSuffix = '';
    if (role === 'heading' && states['level']) {
      levelSuffix = ` level ${states['level']}`;
    }

    const parts: string[] = [];
    if (name) parts.push(`"${name}"`);
    parts.push(`${roleLabel}${levelSuffix}`);
    parts.push(...stateList.filter((s) => s !== 'level'));

    out.push({
      index: 0,
      text: parts.join(' '),
      name,
      role: roleLabel,
      states: stateList,
      element,
    });

    if (role === 'list') {
      for (const child of Array.from(element.childNodes)) {
        if (child.nodeType === 1) walk(child as Element, out, getById);
      }
    }
  } else {
    for (const child of Array.from(element.childNodes)) {
      if (child.nodeType === 1) walk(child as Element, out, getById);
    }
  }
}
