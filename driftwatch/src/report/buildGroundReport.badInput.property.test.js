import { describe, it } from 'vitest'
import fc from 'fast-check'
import { buildGroundReport } from './buildGroundReport.js'
import { nowArb, configArb, alertArb, DOMAIN_LIST, DAY } from './testSupport/generators.js'

const mixedList = (good) => fc.array(fc.oneof(good, fc.anything(), fc.constant(null), fc.constant(undefined)), { maxLength: 15 })
const weirdAlert = fc.record({ domain: fc.oneof(fc.string(), fc.constantFrom(...DOMAIN_LIST)), status: fc.oneof(fc.string(), fc.constantFrom('normal', 'watch', 'act')), urgency: fc.oneof(fc.double(), fc.string()), escalate: fc.anything() }, { requiredKeys: [] })
const weirdReading = fc.record({
  domain: fc.oneof(fc.string(), fc.constantFrom(...DOMAIN_LIST)),
  indicator: fc.oneof(fc.string(), fc.constant(5)),
  timestamp: fc.oneof(fc.double(), fc.string(), fc.constant(undefined)),
  value: fc.oneof(fc.double(), fc.string(), fc.constant(null)),
}, { requiredKeys: [] })

// Feature: ground-report, Property 9: Bad input never throws and keeps the shape
describe('buildGroundReport bad input property', () => {
  it('never throws, keeps six modules, and keeps no unknown alert or bad reading', () => {
    fc.assert(
      fc.property(
        nowArb,
        configArb,
        fc.oneof(fc.anything(), mixedList(fc.oneof(alertArb, weirdAlert))),
        fc.oneof(fc.anything(), mixedList(weirdReading)),
        fc.anything(),
        (now, config, alerts, readings, rules) => {
          const m = buildGroundReport({ alerts, readings, rules, now, config })
          if (m.modules.map((x) => x.domain).join() !== DOMAIN_LIST.join()) return false
          for (const mod of m.modules) for (const a of mod.activeAlerts) if (a.domain !== mod.domain || !DOMAIN_LIST.includes(a.domain)) return false
          if (m.escalations.some((e) => !DOMAIN_LIST.includes(e.domain))) return false
          return m.lastReadings.every(
            (r) => DOMAIN_LIST.includes(r.domain) && Number.isFinite(r.timestamp) && typeof r.value === 'number' && Number.isFinite(r.value) && r.timestamp >= now - config.windowDays * DAY && r.timestamp <= now,
          )
        },
      ),
      { numRuns: 300 },
    )
  })
})
