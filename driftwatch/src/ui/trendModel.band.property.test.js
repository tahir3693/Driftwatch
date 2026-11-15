import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { buildTrendModel } from './trendModel.js'
const alertArb = fc.record({
  domain: fc.constantFrom('radiation', 'isolation', 'gravity', 'environment', 'nutrition', 'system'),
  indicator: fc.string({ minLength: 1 }),
  value: fc.oneof(fc.double({ noNaN: true, noDefaultInfinity: true }), fc.constant(null)),
  baseline: fc.oneof(fc.double({ noNaN: true, noDefaultInfinity: true }), fc.constant(null)),
  status: fc.constantFrom('normal', 'watch', 'act'),
  urgency: fc.integer({ min: 0, max: 100 }),
  why: fc.string(),
  action: fc.string(),
  escalate: fc.boolean(),
  source: fc.string(),
})
const RANK = { normal: 0, watch: 1, act: 2 }
const readingsArb = fc.array(
  fc.record({ timestamp: fc.integer({ min: 0, max: 2_000_000_000_000 }), value: fc.double({ noNaN: true, noDefaultInfinity: true }) }),
  { minLength: 1, maxLength: 20 },
)

// Feature: dashboard, Property 8: Baseline band is centred on the baseline with width of two standard deviations
describe('trendModel band', () => {
  it('is centred on the baseline with width 2 sd', () => {
    fc.assert(
      fc.property(
        alertArb, fc.double({ min: -1000, max: 1000, noNaN: true }), fc.double({ min: 0, max: 1000, noNaN: true }), readingsArb,
        (alert, baseline, sd, readings) => {
          const m = buildTrendModel({ alert: { ...alert, baseline }, rule: undefined, readings, stats: { mean: baseline, sd } })
          expect(m.band.lower).toHaveLength(readings.length)
          expect(m.band.upper).toHaveLength(readings.length)
          m.band.lower.forEach((lo, i) => {
            expect(m.band.upper[i] - lo).toBeCloseTo(2 * sd, 6)
            expect((m.band.upper[i] + lo) / 2).toBeCloseTo(baseline, 6)
          })
          expect(m.baselineNotReady).toBe(false)
        },
      ),
      { numRuns: 100 },
    )
  })
  it('has no band for a null baseline', () => {
    fc.assert(
      fc.property(alertArb, readingsArb, (alert, readings) => {
        const m = buildTrendModel({ alert: { ...alert, baseline: null }, rule: undefined, readings })
        expect(m.band).toBeNull()
        expect(m.baselineNotReady).toBe(true)
      }),
      { numRuns: 100 },
    )
  })
})