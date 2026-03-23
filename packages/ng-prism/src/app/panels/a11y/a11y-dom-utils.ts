const IMPLICIT_ROLES: Record<string, string> = {
  A: 'link',
  BUTTON: 'button',
  SUMMARY: 'button',
  INPUT: 'textbox',
  TEXTAREA: 'textbox',
  SELECT: 'listbox',
  IMG: 'img',
  H1: 'heading',
  H2: 'heading',
  H3: 'heading',
  H4: 'heading',
  H5: 'heading',
  H6: 'heading',
  UL: 'list',
  OL: 'list',
  LI: 'listitem',
  NAV: 'navigation',
  MAIN: 'main',
  HEADER: 'banner',
  FOOTER: 'contentinfo',
  ASIDE: 'complementary',
  FORM: 'form',
  DIALOG: 'dialog',
  TABLE: 'table',
  TR: 'row',
  TH: 'columnheader',
  TD: 'cell',
  THEAD: 'rowgroup',
  TBODY: 'rowgroup',
  DETAILS: 'group',
  ARTICLE: 'article',
  SECTION: 'region',
};

const INPUT_TYPE_ROLES: Record<string, string> = {
  checkbox: 'checkbox',
  radio: 'radio',
  range: 'slider',
  number: 'spinbutton',
  submit: 'button',
  reset: 'button',
  button: 'button',
  image: 'button',
  search: 'searchbox',
};

const HEADING_LEVELS: Record<string, number> = {
  H1: 1, H2: 2, H3: 3, H4: 4, H5: 5, H6: 6,
};

export function getImplicitRole(element: Element): string {
  const tag = element.tagName.toUpperCase();

  if (tag === 'INPUT') {
    const type = (element.getAttribute('type') ?? 'text').toLowerCase();
    return INPUT_TYPE_ROLES[type] ?? 'textbox';
  }

  if (tag === 'A' && !element.getAttribute('href')) {
    return '';
  }

  return IMPLICIT_ROLES[tag] ?? '';
}

export function getRole(element: Element): string {
  return element.getAttribute('role') ?? getImplicitRole(element);
}

export interface AccessibleName {
  name: string;
  source: string;
}

export function computeAccessibleName(
  element: Element,
  getById?: (id: string) => Element | null,
): AccessibleName {
  const labelledBy = element.getAttribute('aria-labelledby');
  if (labelledBy && getById) {
    const parts = labelledBy.trim().split(/\s+/);
    const names = parts
      .map((id) => getById(id)?.textContent?.trim() ?? '')
      .filter(Boolean);
    if (names.length) return { name: names.join(' '), source: 'aria-labelledby' };
  }

  const ariaLabel = element.getAttribute('aria-label');
  if (ariaLabel?.trim()) return { name: ariaLabel.trim(), source: 'aria-label' };

  const tag = element.tagName.toUpperCase();

  if (tag === 'IMG') {
    const alt = element.getAttribute('alt');
    if (alt !== null) return { name: alt, source: 'alt' };
  }

  const text = element.textContent?.trim() ?? '';
  if (text) return { name: text, source: 'text-content' };

  const title = element.getAttribute('title');
  if (title?.trim()) return { name: title.trim(), source: 'title' };

  const placeholder = element.getAttribute('placeholder');
  if (placeholder?.trim()) return { name: placeholder.trim(), source: 'placeholder' };

  return { name: '', source: 'none' };
}


export function extractStates(element: Element): Record<string, string | boolean> {
  const states: Record<string, string | boolean> = {};

  const tag = element.tagName.toUpperCase();

  if (element.getAttribute('aria-hidden') === 'true') states['hidden'] = true;
  if (element.getAttribute('aria-disabled') === 'true' || element.hasAttribute('disabled')) {
    states['disabled'] = true;
  }
  if (element.getAttribute('aria-required') === 'true' || element.hasAttribute('required')) {
    states['required'] = true;
  }

  const checked = element.getAttribute('aria-checked');
  if (checked !== null) states['checked'] = checked;

  const expanded = element.getAttribute('aria-expanded');
  if (expanded !== null) states['expanded'] = expanded === 'true';

  const selected = element.getAttribute('aria-selected');
  if (selected !== null) states['selected'] = selected === 'true';

  const pressed = element.getAttribute('aria-pressed');
  if (pressed !== null) states['pressed'] = pressed;

  const level = element.getAttribute('aria-level');
  if (level !== null) {
    states['level'] = level;
  } else if (HEADING_LEVELS[tag]) {
    states['level'] = String(HEADING_LEVELS[tag]);
  }

  const setsize = element.getAttribute('aria-setsize');
  const posinset = element.getAttribute('aria-posinset');
  if (setsize !== null) states['setsize'] = setsize;
  if (posinset !== null) states['posinset'] = posinset;

  return states;
}

export function isHidden(element: Element): boolean {
  if (element.getAttribute('aria-hidden') === 'true') return true;
  if (element.hasAttribute('hidden')) return true;
  return false;
}

export function statesToList(states: Record<string, string | boolean>): string[] {
  const result: string[] = [];
  for (const [key, value] of Object.entries(states)) {
    if (key === 'hidden') continue;
    if (value === true) result.push(key);
    else if (value !== false) result.push(`${key}: ${value}`);
  }
  return result;
}
