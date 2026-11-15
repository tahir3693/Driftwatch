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
  fc.record({ timestamp: fc.integer({ min: 0, max: 2_000_000_000_000 }), value: fc.integer({ min: -1000, max: 1000 }) }),
  { minLength: 1, maxLength: 10 },
)

// Feature: dashboard, Property 11: Text alternative states the key facts
describe('trendModel alt text', () => {
  it('contains label, latest value, baseline and status label', () => {
    fc.assert(
      fc.property(alertArb, readingsArb, fc.string({ minLength: 1 }), (alert, readings, label) => {
        const m = buildTrendModel({ alert, rule: { label, unit: '' }, readings })
        expect(m.altText).toContain(label)
        expect(m.altText).toContain(String(readings.at(-1).value))
        expect(m.altText).toContain({ normal: 'Normal', watch: 'Watch', act: 'Act' }[alert.status])
        if (alert.baseline === null) expect(m.altText).toContain('baseline not ready')
        else expect(m.altText).toContain(String(alert.baseline))
      }),
      { numRuns: 100 },
    )
  })
})