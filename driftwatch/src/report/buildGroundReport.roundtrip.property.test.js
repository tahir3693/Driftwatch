import { describe, it } from 'vitest'
import fc from 'fast-check'
import { buildGroundReport } from './buildGroundReport.js'
import { nowArb, configArb, alertsArb, readingsArb, rulesArb } from './testSupport/generators.js'
import { isDeepStrictEqual } from 'node:util'

// Feature: ground-report, Property 10: Report model round trip
describe('buildGroundReport round trip property', () => {
  it('survives JSON and is the same when built twice', () => {
    fc.assert(
      fc.property(
        nowArb.chain((now) => fc.tuple(fc.constant(now), configArb, alertsArb, readingsArb(now), rulesArb)),
        ([now, config, alerts, readings, rules]) => {
          const m = buildGroundReport({ alerts, readings, rules, now, config })
          const again = buildGroundReport({ alerts, readings, rules, now, config })
          return isDeepStrictEqual(JSON.parse(JSON.stringify(m)), m) && isDeepStrictEqual(again, m)
        },
      ),
      { numRuns: 200 },
    )
  })
})
