import { spectrumSlot } from './spectrum.js';

describe('spectrumSlot', () => {
  it('spreads nine variants across the full spectrum', () => {
    expect(spectrumSlot(0, 9)).toEqual({ i: 0, n: 9 });
    expect(spectrumSlot(8, 9)).toEqual({ i: 8, n: 9 });
  });

  it('places two variants at both ends', () => {
    expect(spectrumSlot(0, 2)).toEqual({ i: 0, n: 2 });
    expect(spectrumSlot(1, 2)).toEqual({ i: 1, n: 2 });
  });

  /**
   * The CSS divides by (n - 1). At n = 1 that is a division by zero, which
   * makes the whole declaration invalid rather than falling back to something
   * sensible. Reporting n = 2 keeps the arithmetic defined and parks the lone
   * variant at the start of the spectrum.
   */
  it('keeps the arithmetic defined for a single variant', () => {
    expect(spectrumSlot(0, 1)).toEqual({ i: 0, n: 2 });
  });

  it('survives an empty variant list', () => {
    expect(spectrumSlot(0, 0)).toEqual({ i: 0, n: 2 });
  });

  it('clamps an index outside the range', () => {
    expect(spectrumSlot(-3, 9)).toEqual({ i: 0, n: 9 });
    expect(spectrumSlot(99, 9)).toEqual({ i: 8, n: 9 });
  });
});
