import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { cusum, DRIFT_DEFAULTS } from './drift.js';

// Feature: core, Property 13: Drift is not signalled at or below the reference value
// **Validates: Requirements 4.4**
describe('Property 13: no drift at or below the reference value', () => {
  it('signals no drift when every z is at or below k (default k)', () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ min: -10, max: DRIFT_DEFAULTS.k, noNaN: true }), { maxLength: 200 }),
        (series) => {
          const r = cusum(series);
          expect(r.drift).toBe(false);
          expect(r.signalIndex).toBe(-1);
          expect(r.statistic).toBe(0);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('signals no drift for any k and h > 0 when every z is at or below k', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 2, noNaN: true }),
        fc.double({ min: 0.1, max: 10, noNaN: true }),
        fc.array(fc.double({ min: -10, max: 1, noNaN: true }), { maxLength: 200 }),
        (k, h, raw) => {
          const series = raw.map((z) => Math.min(z, k));
          const r = cusum(series, { k, h });
          expect(r.drift).toBe(false);
          expect(r.signalIndex).toBe(-1);
        }
      ),
      { numRuns: 200 }
    );
  });
});
