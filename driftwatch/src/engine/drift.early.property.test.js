import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { cusum } from './drift.js';

// Watch band for the signed bad-direction z-score starts at 1 sd.
const WATCH_Z = 1;

// Feature: core, Property 14: Drift is detected before the watch band is crossed
// **Validates: Requirements 4.5**
describe('cusum early drift detection', () => {
  it('signals drift on a day before a slow ramp reaches the watch band', () => {
    fc.assert(
      fc.property(
        // Slow per-day step, in sd per day, in the bad direction.
        fc.double({ min: 0.005, max: 0.03, noNaN: true }),
        // Extra days after the band is crossed, so the crossing is inside the series.
        fc.integer({ min: 1, max: 10 }),
        (step, extraDays) => {
          const crossDay = Math.ceil(WATCH_Z / step);
          const length = crossDay + extraDays;
          const z = Array.from({ length }, (_, i) => step * (i + 1));

          const watchIndex = z.findIndex((v) => v >= WATCH_Z);
          expect(watchIndex).toBeGreaterThanOrEqual(0);

          const result = cusum(z);
          expect(result.drift).toBe(true);
          expect(result.signalIndex).toBeGreaterThanOrEqual(0);
          expect(result.signalIndex).toBeLessThan(watchIndex);
        },
      ),
      { numRuns: 100 },
    );
  });
});
