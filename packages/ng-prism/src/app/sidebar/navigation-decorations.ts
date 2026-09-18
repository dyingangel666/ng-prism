import type { NavigationDecorationDefinition } from '../../plugin/plugin.types.js';
import type { NavigationItem } from '../services/navigation-item.types.js';

/** One source's verdict on one component, resolved for rendering. */
export interface ItemMark {
  icon: string;
  variant: 'warn' | 'danger';
  label: string;
}

export interface ItemDecorations {
  /** Ordered marks — never empty; `decorateItem` returns null instead. */
  marks: ItemMark[];
  /** Worst variant across `marks`. Drives the group roll-up. */
  worst: 'warn' | 'danger';
  /** Newline-joined labels for the item's `title` attribute. */
  tooltip: string;
}

export interface CategoryRollup {
  /** Number of items in the category carrying at least one mark. */
  problems: number;
  /** Worst variant among them, or null for a clean category. */
  variant: 'warn' | 'danger' | null;
}

const SEVERITY: Record<'warn' | 'danger', number> = { warn: 1, danger: 2 };

/**
 * Built-ins first, then plugin contributions, de-duplicated by id and sorted
 * by `order`.
 *
 * Built-ins win a collision: a plugin must not be able to silence or restyle a
 * core source by claiming its id. Sorting is by `order` alone — the reading
 * contract says position names the source, so registration order must not leak
 * into the result.
 */
export function resolveNavigationDecorations(
  builtin: readonly NavigationDecorationDefinition[],
  fromPlugins: readonly NavigationDecorationDefinition[]
): NavigationDecorationDefinition[] {
  const seen = new Set<string>();
  const result: NavigationDecorationDefinition[] = [];

  for (const def of [...builtin, ...fromPlugins]) {
    if (seen.has(def.id)) continue;
    seen.add(def.id);
    result.push(def);
  }

  return result.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

/**
 * Runs every definition against one item.
 *
 * Returns `null` rather than an empty result for a clean component, so callers
 * cannot accidentally render an empty marker container.
 */
export function decorateItem(
  item: NavigationItem,
  defs: readonly NavigationDecorationDefinition[]
): ItemDecorations | null {
  if (item.kind !== 'component') return null;

  const marks: ItemMark[] = [];
  for (const def of defs) {
    const badge = def.badge(item.data);
    if (!badge) continue;
    marks.push({ icon: def.icon, variant: badge.variant, label: badge.label });
  }

  if (marks.length === 0) return null;

  let worst: 'warn' | 'danger' = 'warn';
  for (const mark of marks) {
    if (SEVERITY[mark.variant] > SEVERITY[worst]) worst = mark.variant;
  }

  return { marks, worst, tooltip: marks.map((m) => m.label).join('\n') };
}

/**
 * Counts the items in one category that carry at least one mark.
 *
 * Items, not marks: a component with three findings is one thing to look at,
 * and a group head reading "3" for a single broken component would overstate
 * the work.
 */
export function rollupCategory(
  items: readonly NavigationItem[],
  defs: readonly NavigationDecorationDefinition[]
): CategoryRollup {
  let problems = 0;
  let variant: 'warn' | 'danger' | null = null;

  for (const item of items) {
    const decorations = decorateItem(item, defs);
    if (!decorations) continue;
    problems++;
    if (!variant || SEVERITY[decorations.worst] > SEVERITY[variant]) {
      variant = decorations.worst;
    }
  }

  return { problems, variant };
}
