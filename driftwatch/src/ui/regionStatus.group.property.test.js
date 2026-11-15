import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { groupByRegion, regionAccessibleName } from './regionStatus.js'
import mapping from '../data/regionMapping.json'
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

// Feature: dashboard, Property 5: Grouping follows the mapping and labels are consistent
describe('regionStatus grouping', () => {
  it('places each mapped alert in its region and loses none', () => {
    const arb = fc.array(fc.oneof(alertArb, alertArb.map((a) => ({ ...a, domain: 'unmapped' }))))
    fc.assert(
      fc.property(arb, (alerts) => {
        const out = groupByRegion(alerts, mapping)
        const mapped = alerts.filter((a) => a.domain !== 'unmapped')
        expect(Object.values(out).flat()).toHaveLength(mapped.length)
        for (const r of mapping.regions) {
          expect(out[r.id]).toEqual(mapped.filter((a) => r.domains.includes(a.domain)))
        }
      }),
      { numRuns: 100 },
    )
  })
  it('builds the accessible name from the name and the label', () => {
    fc.assert(
      fc.property(fc.string(), fc.constantFrom('normal', 'watch', 'act', null), (name, status) => {
        const label = { normal: 'Normal', watch: 'Watch', act: 'Act' }[status] ?? 'No data'
        return regionAccessibleName(name, status) === name + ': ' + label
      }),
      { numRuns: 100 },
    )
  })
})