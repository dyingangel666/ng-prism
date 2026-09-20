import type {
  PanelBadge,
  PanelDefinition,
  RuntimeComponent,
} from '../../../plugin/plugin.types.js';
import { deriveA11ySummary } from '../a11y/a11y-summary.js';
import type { A11yScoreResult, A11yThresholds } from '../a11y/a11y.types.js';

/**
 * The live figures the built-in tabs badge themselves with.
 *
 * Passed in rather than injected so this stays a pure function. The panel host
 * reads them from its own services and hands them over; that is the whole
 * reason the built-in chain could not simply be expressed as
 * {@link PanelDefinition.badge} callbacks — `a11y` reports a running audit, not
 * anything the component's meta holds.
 *
 * The thresholds travel with the audit result rather than being baked in here.
 * The navigation marker grades the build-time report against the configured
 * numbers; a tab grading the live audit on its own scale would put an amber
 * icon in the sidebar next to a red badge on the tab for the same component.
 */
export interface PanelBadgeContext {
  inputCount: number;
  a11yResult: A11yScoreResult | null;
  a11yThresholds: A11yThresholds;
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
    const result = context.a11yResult;
    if (result === null) return null;
    return {
      text: String(result.score),
      variant: deriveA11ySummary(result, context.a11yThresholds).variant,
    };
  }

  return null;
}
