import { describe, it } from 'vitest'
import fc from 'fast-check'
import { buildGroundReport } from './buildGroundReport.js'
import { nowArb, alertsArb, bigConfig, DOMAIN_LIST } from './testSupport/generators.js'

// Feature: ground-report, Property 3: Active alerts are exactly the watch and act alerts
describe('buildGroundReport active alerts property', () => {
  it('lists the watch and act alerts per domain by urgency, input order for ties, text unchanged', () => {
    fc.assert(
      fc.property(nowArb, alertsArb, (now, alerts) => {
        const m = buildGroundReport({ alerts, readings: [], rules: {}, now, config: bigConfig() })
        return DOMAIN_LIST.every((domain, i) => {
          const expected = alerts
            .map((a, index) => ({ a, index }))
            .filter(({ a }) => a.domain === domain && (a.status === 'watch' || a.status === 'act'))
            .sort((x, y) => y.a.urgency - x.a.urgency || x.index - y.index)
            .map(({ a }) => a)
          const listed = m.modules[i].activeAlerts
          if (listed.length !== expected.length) return false
          if (listed.some((a) => a.status === 'normal')) return false
          return listed.every((a, k) => a.why === expected[k].why && a.action === expected[k].action && a.source === expected[k].source && a.indicator === expected[k].indicator && a.urgency === expected[k].urgency && a.status === expected[k].status)
        })
      }),
      { numRuns: 200 },
    )
  })
})
