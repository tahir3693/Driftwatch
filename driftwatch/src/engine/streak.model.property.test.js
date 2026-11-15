import { describe, it } from 'vitest'
import fc from 'fast-check'
import { computeStreak } from './streak.js'
import { shiftDayKey } from './dayKey.js'

const BASE = '2025-01-01'
const MODULES = ['environment', 'radiation', 'isolation', 'gravity', 'nutrition']
const recordArb = fc.record({
  dayKey: fc.integer({ min: 0, max: 25 }).map((k) => shiftDayKey(BASE, k)),
  module: fc.constantFrom(...MODULES),
})

// Reference model: count back day by day using a plain map of day -> distinct modules.
function reference(records, today, min) {
  const days = {}
  for (const r of records) (days[r.dayKey] ??= []).includes(r.module) || days[r.dayKey].push(r.module)
  const ok = (k) => (days[k]?.length ?? 0) >= min
  let n = 0
  let k = ok(today) ? today : shiftDayKey(today, -1)
  while (ok(k)) {
    n++
    k = shiftDayKey(k, -1)
  }
  return n
}

// Feature: checkin, Property 10: Streak matches a reference model
describe('streak reference model', () => {
  it('matches the reference for any records, today and minimum', () => {
    fc.assert(
      fc.property(fc.array(recordArb, { maxLength: 120 }), fc.integer({ min: 20, max: 30 }), fc.integer({ min: 1, max: 4 }), (records, offset, min) => {
        const today = shiftDayKey(BASE, offset)
        return computeStreak(records, today, min) === reference(records, today, min)
      }),
      { numRuns: 300 },
    )
  })
})

export { reference, TODAY, recordArb, BASE, MODULES }