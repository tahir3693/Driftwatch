import { describe, it } from 'vitest'
import fc from 'fast-check'
import { computeStreak } from './streak.js'
import { shiftDayKey } from './dayKey.js'

const BASE = '2025-01-01'
const TODAY = shiftDayKey(BASE, 25)
const MODULES = ['environment', 'radiation', 'isolation', 'gravity', 'nutrition']
const recordArb = fc.record({
  dayKey: fc.integer({ min: 0, max: 25 }).map((k) => shiftDayKey(BASE, k)),
  module: fc.constantFrom(...MODULES),
})

const countedDays = (records, min) => {
  const by = new Map()
  for (const r of records) by.set(r.dayKey, (by.get(r.dayKey) ?? new Set()).add(r.module))
  return new Set([...by].filter(([, s]) => s.size >= min).map(([k]) => k))
}
const modulesFor = (dayKey, n) => MODULES.slice(0, n).map((module) => ({ dayKey, module }))

// Feature: checkin, Property 12: Streak metamorphic relations
// "Before the first day of the current run" means a gap of at least one missing day (2+ days before the run start);
// a day directly before the run extends it.
describe('streak metamorphic relations', () => {
  it('ignores a day at least 2 days before the run start', () => {
    fc.assert(
      fc.property(fc.array(recordArb, { maxLength: 100 }), fc.integer({ min: 1, max: 3 }), fc.integer({ min: 2, max: 30 }), (records, min, gap) => {
        const n = computeStreak(records, TODAY, min)
        if (n === 0) return true
        const counted = countedDays(records, min)
        const end = counted.has(TODAY) ? TODAY : shiftDayKey(TODAY, -1)
        const start = shiftDayKey(end, -(n - 1))
        const extra = modulesFor(shiftDayKey(start, -gap), min)
        return computeStreak([...records, ...extra], TODAY, min) === n
      }),
      { numRuns: 300 },
    )
  })
  it('a day directly before the run extends it by one plus the run it joins', () => {
    fc.assert(
      fc.property(fc.array(recordArb, { maxLength: 100 }), fc.integer({ min: 1, max: 3 }), (records, min) => {
        const n = computeStreak(records, TODAY, min)
        if (n === 0) return true
        const counted = countedDays(records, min)
        const end = counted.has(TODAY) ? TODAY : shiftDayKey(TODAY, -1)
        const start = shiftDayKey(end, -(n - 1))
        const joinDay = shiftDayKey(start, -1)
        let joined = 0
        let k = shiftDayKey(joinDay, -1)
        while (counted.has(k)) {
          joined++
          k = shiftDayKey(k, -1)
        }
        return computeStreak([...records, ...modulesFor(joinDay, min)], TODAY, min) === n + 1 + joined
      }),
      { numRuns: 300 },
    )
  })
  it('adding the missing current day raises the streak by exactly 1', () => {
    fc.assert(
      fc.property(fc.array(recordArb, { maxLength: 100 }), fc.integer({ min: 1, max: 3 }), (records, min) => {
        if (countedDays(records, min).has(TODAY)) return true
        const n = computeStreak(records, TODAY, min)
        return computeStreak([...records, ...modulesFor(TODAY, min)], TODAY, min) === n + 1
      }),
      { numRuns: 300 },
    )
  })
})