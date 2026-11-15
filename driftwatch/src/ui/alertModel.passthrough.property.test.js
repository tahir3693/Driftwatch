import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { alertCardModel } from './alertModel.js'
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
const ruleArb = fc.option(
  fc.record({ label: fc.string(), unit: fc.string(), howToMeasure: fc.string(), whyItMatters: fc.string() }),
  { nil: undefined },
)

// Feature: dashboard, Property 7: Alert card text is passed through unchanged
describe('alertModel pass-through', () => {
  it('keeps why, action and source, and flags a null baseline', () => {
    fc.assert(
      fc.property(alertArb, ruleArb, (alert, rule) => {
        const m = alertCardModel(alert, rule)
        expect(m.why).toBe(alert.why)
        expect(m.action).toBe(alert.action)
        expect(m.source).toBe(alert.source)
        expect(m.baselineText === 'Baseline not ready').toBe(alert.baseline === null)
        expect(m.statusLabel).toBe({ normal: 'Normal', watch: 'Watch', act: 'Act' }[alert.status])
        expect(m.urgency).toBe(alert.urgency)
      }),
      { numRuns: 100 },
    )
  })
})