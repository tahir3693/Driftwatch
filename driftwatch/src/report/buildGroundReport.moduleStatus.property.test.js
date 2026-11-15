import { describe, it } from 'vitest'
import fc from 'fast-check'
import { buildGroundReport } from './buildGroundReport.js'
import { statusRank } from '../engine/urgency.js'
import { nowArb, configArb, alertsArb, DOMAIN_LIST } from './testSupport/generators.js'

// Feature: ground-report, Property 2: Module status and urgency are the highest of the module's Alerts
describe('buildGroundReport module status property', () => {
  it('gives the highest status and urgency per domain, and null when there is no alert', () => {
    fc.assert(
      fc.property(nowArb, configArb, alertsArb, (now, config, alerts) => {
        const m = buildGroundReport({ alerts, readings: [], rules: {}, now, config })
        return DOMAIN_LIST.every((domain, i) => {
          const own = alerts.filter((a) => a.domain === domain)
          const mod = m.modules[i]
          if (own.length === 0) return mod.domain === domain && mod.status === null && mod.urgency === null
          const top = Math.max(...own.map((a) => statusRank(a.status)))
          return statusRank(mod.status) === top && mod.urgency === Math.max(...own.map((a) => a.urgency))
        })
      }),
      { numRuns: 200 },
    )
  })
})
