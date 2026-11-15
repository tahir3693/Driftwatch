import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { sortByUrgency } from './regionStatus.js'
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

// Feature: dashboard, Property 6: Alerts for a region are sorted by urgency
describe('regionStatus sort', () => {
  it('returns a permutation with urgency never increasing', () => {
    fc.assert(
      fc.property(fc.array(alertArb), (alerts) => {
        const out = sortByUrgency(alerts)
        expect(out).toHaveLength(alerts.length)
        for (const a of alerts) expect(out).toContain(a)
        for (let i = 1; i < out.length; i++) expect(out[i].urgency).toBeLessThanOrEqual(out[i - 1].urgency)
      }),
      { numRuns: 100 },
    )
  })
})