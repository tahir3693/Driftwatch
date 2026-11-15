import { describe, it } from 'vitest'
import fc from 'fast-check'
import { buildGroundReport } from './buildGroundReport.js'
import { nowArb, configArb, alertsArb, bigConfig } from './testSupport/generators.js'

// Feature: ground-report, Property 4: Escalations are every escalating active alert and are never capped
describe('buildGroundReport escalations property', () => {
  it('has one entry per active escalating alert, by urgency, whatever the caps', () => {
    fc.assert(
      fc.property(nowArb, configArb, alertsArb, (now, config, alerts) => {
        const m = buildGroundReport({ alerts, readings: [], rules: {}, now, config })
        const expected = alerts.filter((a) => (a.status === 'watch' || a.status === 'act') && a.escalate === true)
        if (m.escalations.length !== expected.length) return false
        const key = (e) => `${e.domain}|${e.indicator}|${e.urgency}|${e.status}|${e.action}`
        if ([...m.escalations.map(key)].sort().join('\n') !== [...expected.map(key)].sort().join('\n')) return false
        for (let i = 1; i < m.escalations.length; i++) if (m.escalations[i - 1].urgency < m.escalations[i].urgency) return false
        const big = buildGroundReport({ alerts, readings: [], rules: {}, now, config: bigConfig() })
        return big.escalations.length === m.escalations.length
      }),
      { numRuns: 200 },
    )
  })
})
