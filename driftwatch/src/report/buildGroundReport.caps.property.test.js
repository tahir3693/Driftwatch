import { describe, it } from 'vitest'
import fc from 'fast-check'
import { buildGroundReport } from './buildGroundReport.js'
import { nowArb, configArb, alertsArb, DOMAIN_LIST } from './testSupport/generators.js'

// Feature: ground-report, Property 5: Caps keep the most urgent and newest items and report the truncation
describe('buildGroundReport caps property', () => {
  it('lists min(total, cap) items, keeps the most urgent and newest, and reports the truncation', () => {
    fc.assert(
      fc.property(nowArb, configArb, alertsArb, fc.integer({ min: 0, max: 30 }), (now, config, alerts, readingCount) => {
        const readings = []
        for (let i = 0; i < readingCount; i++) {
          readings.push({ domain: DOMAIN_LIST[i % 6], indicator: `k${i}`, timestamp: now - i * 1000, value: i })
        }
        const m = buildGroundReport({ alerts, readings, rules: {}, now, config })
        const a = config.maxActiveAlertsPerModule
        const r = config.maxLastReadings
        let activeTotal = 0
        let activeListed = 0
        for (const mod of m.modules) {
          const urgencies = alerts
            .filter((x) => x.domain === mod.domain && x.status !== 'normal')
            .map((x) => x.urgency)
            .sort((p, q) => q - p)
          const listed = Math.min(urgencies.length, a)
          if (mod.activeAlerts.length !== listed) return false
          if (mod.activeTotal !== urgencies.length || mod.moreAlerts !== urgencies.length - listed) return false
          // The listed alerts are the top `listed` urgencies, so every unlisted one is no more urgent.
          if (JSON.stringify(mod.activeAlerts.map((x) => x.urgency)) !== JSON.stringify(urgencies.slice(0, listed))) return false
          activeTotal += urgencies.length
          activeListed += listed
        }
        const readingsListed = Math.min(readingCount, r)
        if (m.lastReadings.length !== readingsListed) return false
        // Newest first, and the listed rows are exactly the newest ones.
        const expectedTimes = Array.from({ length: readingsListed }, (_, i) => now - i * 1000)
        if (JSON.stringify(m.lastReadings.map((x) => x.timestamp)) !== JSON.stringify(expectedTimes)) return false
        return (
          JSON.stringify(m.counts) ===
          JSON.stringify({
            activeTotal,
            activeListed,
            readingsTotal: readingCount,
            readingsListed,
            moreReadings: readingCount - readingsListed,
            capped: activeListed < activeTotal || readingsListed < readingCount,
          })
        )
      }),
      { numRuns: 300 },
    )
  })
})
