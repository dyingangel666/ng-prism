import type {
  PanelBadge,
  PanelDefinition,
  RuntimeComponent,
} from '../../../plugin/plugin.types.js';

/**
 * The live figures the built-in tabs badge themselves with.
 *
 * Passed in rather than injected so this stays a pure function. The panel host
 * reads them from its own services and hands them over; that is the whole
 * reason the built-in chain could not simply be expressed as
 * {@link PanelDefinition.badge} callbacks — `a11y` reports a running audit, not
 * anything the component's meta holds.
 */
export interface PanelBadgeContext {
  inputCount: number;
  a11yScore: number | null;
  coverageScore: number | null;
}

/** Green at 90, amber down to 70, red below — shared by a11y and coverage. */
function gradeScore(score: number): PanelBadge {
  return {
    text: String(score),
    variant: score >= 90 ? 'ok' : score >= 70 ? 'warn' : 'danger',
  };
}

/**
 * The badge a panel's tab carries, if any.
 *
 * A panel that declares its own {@link PanelDefinition.badge} wins outright,
 * which is what lets a plugin put a number on its own tab without the panel
 * host learning about it. The chain below it predates that hook and stays for
 * the tabs it already covers.
 *
 * Returning `null` is the common case and the important one: a badge that is
 * always present stops being a signal, so every branch here has a way to say
 * "nothing worth reporting" rather than falling back to a zero.
 */
export function resolvePanelBadge(
  panel: PanelDefinition,
  component: RuntimeComponent | null,
  context: PanelBadgeContext
): PanelBadge | null {
  if (panel.badge) {
    // No component means no subject to report on; calling the hook with a
    // placeholder would invite it to invent a number.
    return component ? panel.badge(component) : null;
  }

  if (panel.id === 'controls') {
    return context.inputCount > 0
      ? { text: String(context.inputCount), variant: 'default' }
      : null;
  }

  if (panel.id === 'a11y') {
    // `=== null` rather than a falsy check: a score of 0 is a real, and the
    // most urgent, thing to show.
    return context.a11yScore === null ? null : gradeScore(context.a11yScore);
  }

  if (panel.id === 'coverage') {
    return context.coverageScore === null
      ? null
      : gradeScore(context.coverageScore);
  }

  return null;
}
