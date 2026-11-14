import { describe, it, expect } from 'vitest';
import { zScore } from './zScore.js';

describe('zScore', () => {
  it('uses (value - mean) / sd when sd > 0', () => {
    expect(zScore(12, { mean: 10, sd: 2 })).toBe(1);
    expect(zScore(7, { mean: 10, sd: 2 })).toBe(-1.5);
    expect(zScore(10, { mean: 10, sd: 2 })).toBe(0);
  });

  it('returns 0 when sd = 0 and value equals mean', () => {
    expect(zScore(5, { mean: 5, sd: 0 })).toBe(0);
    expect(zScore(5, { mean: 5, sd: 0 }, 10)).toBe(0);
  });

  it('uses the default fallback spread of 1 when sd = 0 and value differs', () => {
    expect(zScore(8, { mean: 5, sd: 0 })).toBe(3);
    expect(zScore(2, { mean: 5, sd: 0 })).toBe(-3);
  });

  it('uses a custom fallback spread when sd = 0', () => {
    expect(zScore(9, { mean: 5, sd: 0 }, 2)).toBe(2);
  });

  it('falls back to 1 for an invalid fallback spread', () => {
    for (const bad of [0, -2, NaN, Infinity, undefined, null, '3']) {
      const z = zScore(8, { mean: 5, sd: 0 }, bad);
      expect(z).toBe(3);
    }
  });

  it('never returns NaN or Infinity', () => {
    const cases = [
      zScore(1, { mean: 1, sd: 0 }),
      zScore(Infinity, { mean: 1, sd: 0 }),
      zScore(NaN, { mean: 1, sd: 1 }),
      zScore(1, { mean: NaN, sd: 1 }),
      zScore(1, { mean: 1, sd: NaN }),
      zScore(1, undefined),
      zScore(Number.MAX_VALUE, { mean: -Number.MAX_VALUE, sd: 1e-300 }),
    ];
    for (const z of cases) expect(Number.isFinite(z)).toBe(true);
  });
});
