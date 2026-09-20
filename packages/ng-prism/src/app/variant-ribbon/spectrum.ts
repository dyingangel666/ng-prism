/** Where one variant tab sits on the spectrum rail. */
export interface SpectrumSlot {
  /** Zero-based position. */
  i: number;
  /** Total positions, never below 2. */
  n: number;
}

/**
 * Maps a variant's index onto the spectrum rail.
 *
 * The CSS reads `calc(var(--i) / (var(--n) - 1) * 100%)`, so n = 1 would
 * divide by zero — and an invalid calc() drops the whole declaration rather
 * than falling back to a sane default, leaving the result dependent on
 * whatever else happens to target background-position. Reporting a floor of 2
 * keeps the arithmetic defined and parks a lone variant at the start of the
 * spectrum, which is also what it should look like.
 */
export function spectrumSlot(index: number, count: number): SpectrumSlot {
  const n = count < 2 ? 2 : count;
  const i = index < 0 ? 0 : index > n - 1 ? n - 1 : index;
  return { i, n };
}
