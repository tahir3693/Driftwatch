import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { computeRegionStatus } from './regionStatus.js'
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

// Feature: dashboard, Property 4: Escalate is true if any Alert escalates
describe('regionStatus escalate', () => {
  it('is true iff some alert escalates', () => {
    fc.assert(
      fc.property(fc.array(alertArb), (alerts) => {
        return computeRegionStatus(alerts).escalate === alerts.some((a) => a.escalate === true)
      }),
      { numRuns: 100 },
    )
  })
})