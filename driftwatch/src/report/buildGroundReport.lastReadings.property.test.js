import { describe, it } from 'vitest'
import fc from 'fast-check'
import { buildGroundReport } from './buildGroundReport.js'
import { nowArb, readingsArb, rulesArb, bigConfig, DAY } from './testSupport/generators.js'

// Feature: ground-report, Property 8: Last reading per indicator is the latest in the window
describe('buildGroundReport last readings property', () => {
  it('has one row per in-window indicator with the latest reading, rule label and unit', () => {
    fc.assert(
      fc.property(
        nowArb.chain((now) => fc.tuple(fc.constant(now), readingsArb(now), rulesArb)),
        ([now, readings, rules]) => {
          const config = bigConfig()
          const m = buildGroundReport({ alerts: [], readings, rules, now, config })
          const start = now - config.windowDays * DAY
          const expected = new Map()
          for (const r of readings) {
            if (r.timestamp < start || r.timestamp > now) continue
            const key = `${r.domain}/${r.indicator}`
            const cur = expected.get(key)
            if (!cur || r.timestamp >= cur.timestamp) expected.set(key, r)
          }
          if (m.lastReadings.length !== expected.size) return false
          return m.lastReadings.every((row) => {
            const exp = expected.get(`${row.domain}/${row.indicator}`)
            if (!exp || exp.timestamp !== row.timestamp || exp.value !== row.value) return false
            const rule = rules[`${row.domain}/${row.indicator}`]
            const label = rule && typeof rule.label === 'string' && rule.label !== '' ? rule.label : row.indicator
            const unit = rule && typeof rule.unit === 'string' ? rule.unit : ''
            return row.indicatorLabel === label && row.unit === unit
          })
        },
      ),
      { numRuns: 200 },
    )
  })
})
