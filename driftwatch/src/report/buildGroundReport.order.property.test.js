import { describe, it } from 'vitest'
import fc from 'fast-check'
import { buildGroundReport } from './buildGroundReport.js'
import { nowArb, configArb, distinctUrgencyAlertsArb, readingsArb } from './testSupport/generators.js'

const shuffled = (arrArb) => arrArb.chain((arr) => fc.tuple(fc.constant(arr), fc.shuffledSubarray(arr, { minLength: arr.length, maxLength: arr.length })))

// Feature: ground-report, Property 6: Order independence
describe('buildGroundReport order property', () => {
  it('returns equal models for any permutation of alerts and readings', () => {
    fc.assert(
      fc.property(
        nowArb.chain((now) => fc.tuple(fc.constant(now), configArb, shuffled(distinctUrgencyAlertsArb), shuffled(readingsArb(now, { distinct: true })))),
        ([now, config, [alerts, alertsPerm], [readings, readingsPerm]]) => {
          const a = buildGroundReport({ alerts, readings, rules: {}, now, config })
          const b = buildGroundReport({ alerts: alertsPerm, readings: readingsPerm, rules: {}, now, config })
          return JSON.stringify(a) === JSON.stringify(b)
        },
      ),
      { numRuns: 200 },
    )
  })
})
