import { describe, it } from 'vitest'
import fc from 'fast-check'
import { buildGroundReport } from './buildGroundReport.js'
import { nowArb, configArb, alertsArb, readingsArb, rulesArb, deepFreeze } from './testSupport/generators.js'

const snapshot = (v) => JSON.stringify(v, (k, x) => (x === undefined ? '__undefined__' : x))

// Feature: ground-report, Property 7: Inputs are not modified
describe('buildGroundReport immutability property', () => {
  it('does not throw on frozen inputs, leaves them equal, and the model is independent of them', () => {
    fc.assert(
      fc.property(
        nowArb.chain((now) => fc.tuple(fc.constant(now), configArb, alertsArb, readingsArb(now), rulesArb)),
        ([now, config, alerts, readings, rules]) => {
          const before = snapshot({ alerts, readings, rules, config })
          deepFreeze(alerts)
          deepFreeze(readings)
          deepFreeze(rules)
          deepFreeze(config)
          const m = buildGroundReport({ alerts, readings, rules, now, config })
          for (const mod of m.modules) for (const a of mod.activeAlerts) a.why = 'changed'
          for (const row of m.lastReadings) row.value = -1
          m.escalations.forEach((e) => {
            e.action = 'changed'
          })
          return snapshot({ alerts, readings, rules, config }) === before
        },
      ),
      { numRuns: 200 },
    )
  })
})
