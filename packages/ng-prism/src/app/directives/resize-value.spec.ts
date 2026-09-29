import { resizeStep, resizeValue } from './resize-value.js';

describe('resizeValue', () => {
  it('should add the delta unchanged at the default scale', () => {
    expect(resizeValue(200, 40, 1, 100, 400)).toBe(240);
  });

  it('should double the delta for a centred edge', () => {
    // A grip on a centred box moves one edge; the box grows at both.
    expect(resizeValue(390, 30, 2, 240, 1600)).toBe(450);
  });

  it('should invert the delta for the opposite edge', () => {
    expect(resizeValue(390, 30, -2, 240, 1600)).toBe(330);
  });

  it('should clamp to the ceiling', () => {
    expect(resizeValue(1500, 400, 2, 240, 1600)).toBe(1600);
  });

  it('should clamp to the floor', () => {
    expect(resizeValue(300, -400, 2, 240, 1600)).toBe(240);
  });
});

describe('resizeStep', () => {
  it('should step forward at the default scale', () => {
    expect(resizeStep(1)).toBe(10);
  });

  it('should keep the magnitude when the scale is larger', () => {
    // The keyboard is not a drag: a scale of 2 doubles a pointer delta, but an
    // arrow key should still move the value by one step, not two.
    expect(resizeStep(2)).toBe(10);
  });

  it('should invert direction for a negative scale', () => {
    expect(resizeStep(-2)).toBe(-10);
  });
});
