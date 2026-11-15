import { describe, it } from 'vitest'
import fc from 'fast-check'
import { buildGroundReport } from './buildGroundReport.js'
import { nowArb, configArb, domainArb, DAY } from './testSupport/generators.js'

// Feature: ground-report, Property 1: Window is inclusive at both ends
describe('buildGroundReport window property', () => {
  it('includes a lone reading if and only if now - window <= timestamp <= now', () => {
    fc.assert(
      fc.property(
        nowArb,
        configArb,
        domainArb,
        fc.integer({ min: -3, max: 3 }),
        fc.oneof(fc.constant(0), fc.constant(1), fc.integer({ min: -20 * DAY, max: 5 * DAY })),
        fc.boolean(),
        fc.integer({ min: -1000, max: 1000 }),
        (now, config, domain, edgeShift, offset, atStart, value) => {
          const windowMs = config.windowDays * DAY
          const base = atStart ? now - windowMs : now
          const timestamp = offset <= 1 && offset >= 0 ? base + edgeShift : now - windowMs + offset
          const big = { ...config, maxLastReadings: 100, maxActiveAlertsPerModule: 100 }
          const m = buildGroundReport({ alerts: [], readings: [{ timestamp, domain, indicator: 'ind', value }], rules: {}, now, config: big })
          const inside = now - windowMs <= timestamp && timestamp <= now
          if (m.windowStart !== now - windowMs || m.windowEnd !== now) return false
          return inside ? m.lastReadings.length === 1 && m.lastReadings[0].timestamp === timestamp : m.lastReadings.length === 0
        },
      ),
      { numRuns: 300 },
    )
  })

  it('treats the two edges and the milliseconds just outside them exactly', () => {
    fc.assert(
      fc.property(nowArb, configArb, (now, config) => {
        const start = now - config.windowDays * DAY
        const rows = (timestamp) =>
          buildGroundReport({ alerts: [], readings: [{ timestamp, domain: 'gravity', indicator: 'x', value: 1 }], rules: {}, now, config }).lastReadings.length
        return rows(start) === 1 && rows(now) === 1 && rows(start - 1) === 0 && rows(now + 1) === 0
      }),
      { numRuns: 100 },
    )
  })
})
