import { describe, it } from 'vitest'
import fc from 'fast-check'
import { dayKeyOf, dayBounds, shiftDayKey } from './dayKey.js'

// Feature: checkin, Property 17: Day key round trip
describe('dayKey round trip', () => {
  it('keeps every timestamp inside its own day and shifts back and forth', () => {
    fc.assert(
      fc.property(fc.integer({ min: 946_684_800_000, max: 2_524_608_000_000 }), fc.integer({ min: -4000, max: 4000 }), (ts, n) => {
        const key = dayKeyOf(ts)
        if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return false
        const { start, end } = dayBounds(key)
        if (!(start <= ts && ts < end)) return false
        return shiftDayKey(shiftDayKey(key, n), -n) === key
      }),
      { numRuns: 200 },
    )
  })
})