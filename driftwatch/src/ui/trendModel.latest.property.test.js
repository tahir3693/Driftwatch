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

// Feature: dashboard, Property 9: Exactly the latest point is marked
describe('trendModel latest point', () => {
  it('marks only the last point', () => {
    fc.assert(
      fc.property(alertArb, readingsArb, (alert, readings) => {
        const m = buildTrendModel({ alert, rule: undefined, readings })
        expect(m.values).toEqual(readings.map((r) => r.value))
        expect(m.pointStyles).toHaveLength(readings.length)
        const last = m.pointStyles.at(-1)
        const others = m.pointStyles.slice(0, -1)
        expect(others.every((s) => s === others[0])).toBe(true)
        if (others.length) expect(last).not.toBe(others[0])
      }),
      { numRuns: 100 },
    )
  })
})