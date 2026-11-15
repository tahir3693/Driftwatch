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

// Feature: dashboard, Property 1: Highest status wins
describe('regionStatus highest status', () => {
  it('returns the highest-ranked status, null for none', () => {
    fc.assert(
      fc.property(fc.array(alertArb), (alerts) => {
        const { status } = computeRegionStatus(alerts)
        if (alerts.length === 0) return status === null
        const top = Math.max(...alerts.map((a) => RANK[a.status]))
        return RANK[status] === top
      }),
      { numRuns: 100 },
    )
    expect(computeRegionStatus([]).status).toBeNull()
  })
})