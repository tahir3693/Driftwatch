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

// Feature: dashboard, Property 2: Region status is order independent
describe('regionStatus order', () => {
  it('gives the same result for any permutation', () => {
    fc.assert(
      fc.property(fc.array(alertArb), fc.infiniteStream(fc.nat()), (alerts, rnd) => {
        const shuffled = [...alerts].sort(() => rnd.next().value % 3 - 1)
        expect(computeRegionStatus(shuffled)).toEqual(computeRegionStatus(alerts))
      }),
      { numRuns: 100 },
    )
  })
  it('is unchanged by reversing', () => {
    fc.assert(
      fc.property(fc.array(alertArb), (alerts) => {
        expect(computeRegionStatus([...alerts].reverse())).toEqual(computeRegionStatus(alerts))
      }),
      { numRuns: 100 },
    )
  })
})