import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { cusum, DRIFT_DEFAULTS } from './drift.js';

const zSeries = fc.array(fc.double({ min: -5, max: 8, noNaN: true }), { maxLength: 60 });
const num = fc.double({ min: 0, max: 10, noNaN: true });
const first = (r) => (r.signalIndex === -1 ? Infinity : r.signalIndex);

describe('drift threshold properties', () => {
  // Feature: core, Property 16: Higher threshold never signals earlier
  // **Validates: Requirements 4.6**
  it('a higher h never signals earlier than a lower h', () => {
    fc.assert(
      fc.property(zSeries, num, num, num, (z, k, a, b) => {
        const [h1, h2] = a <= b ? [a, b] : [b, a];
        const r1 = cusum(z, { k, h: h1 });
        const r2 = cusum(z, { k, h: h2 });
        expect(first(r2)).toBeGreaterThanOrEqual(first(r1));
        if (r2.drift) expect(r1.drift).toBe(true);
      }),
      { numRuns: 200 },
    );
  });

  // Feature: core, Property 16: Higher threshold never signals earlier
  // **Validates: Requirements 4.6**
  it('uses the passed k and h, falling back to DRIFT_DEFAULTS', () => {
    fc.assert(
      fc.property(zSeries, num, num, (z, k, h) => {
        expect(cusum(z)).toEqual(cusum(z, { k: DRIFT_DEFAULTS.k, h: DRIFT_DEFAULTS.h }));
        expect(cusum(z, { k })).toEqual(cusum(z, { k, h: DRIFT_DEFAULTS.h }));
        expect(cusum(z, { h })).toEqual(cusum(z, { k: DRIFT_DEFAULTS.k, h }));
      }),
      { numRuns: 200 },
    );
  });
});
