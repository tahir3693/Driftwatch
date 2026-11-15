import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { zScore } from './zScore.js';

// Feature: core, Property 7: Z-score is finite and correct
// **Validates: Requirements 2.3, 2.4**

const num = fc.double({ min: -1e6, max: 1e6, noNaN: true });
const spreadArb = fc.double({ min: 1e-3, max: 1e3, noNaN: true });
const sdPositive = fc.double({ min: 1e-3, max: 1e6, noNaN: true });

describe('zScore properties', () => {
  it('is finite for any finite value and any baseline, including sd = 0', () => {
    fc.assert(
      fc.property(
        num,
        num,
        fc.oneof(fc.constant(0), sdPositive),
        spreadArb,
        (value, mean, sd, spread) => {
          expect(Number.isFinite(zScore(value, { mean, sd }, spread))).toBe(true);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('equals (value - mean) / sd when sd > 0', () => {
    fc.assert(
      fc.property(num, num, sdPositive, spreadArb, (value, mean, sd, spread) => {
        expect(zScore(value, { mean, sd }, spread)).toBe((value - mean) / sd);
      }),
      { numRuns: 200 }
    );
  });

  it('is 0 when sd = 0 and value = mean', () => {
    fc.assert(
      fc.property(num, spreadArb, (mean, spread) => {
        expect(zScore(mean, { mean, sd: 0 }, spread)).toBe(0);
      }),
      { numRuns: 200 }
    );
  });

  it('equals (value - mean) / fallbackSpread when sd = 0 and value != mean', () => {
    fc.assert(
      fc.property(num, num, spreadArb, (value, mean, spread) => {
        fc.pre(value !== mean);
        expect(zScore(value, { mean, sd: 0 }, spread)).toBe((value - mean) / spread);
      }),
      { numRuns: 200 }
    );
  });
});
