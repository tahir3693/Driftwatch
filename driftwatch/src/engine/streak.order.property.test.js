import { describe, it } from 'vitest'
import fc from 'fast-check'
import { computeStreak } from './streak.js'
import { shiftDayKey } from './dayKey.js'

const BASE = '2025-01-01'
const TODAY = shiftDayKey(BASE, 25)
const recordArb = fc.record({
  dayKey: fc.integer({ min: 0, max: 25 }).map((k) => shiftDayKey(BASE, k)),
  module: fc.constantFrom('environment', 'radiation', 'isolation', 'gravity', 'nutrition'),
})

// Feature: checkin, Property 11: Streak ignores order and duplicates
describe('streak order and duplicates', () => {
  it('gives the same streak for any permutation and any added duplicates', () => {
    fc.assert(
      fc.property(fc.array(recordArb, { maxLength: 80 }), fc.integer({ min: 1, max: 3 }), fc.nat(), (records, min, seed) => {
        const base = computeStreak(records, TODAY, min)
        const shuffled = [...records].sort((a, b) => ((a.dayKey + a.module).length * 7 + seed) % 3 - 1)
        const reversed = [...records].reverse()
        const doubled = [...records, ...records.filter((_, i) => (i + seed) % 2 === 0)]
        return computeStreak(shuffled, TODAY, min) === base && computeStreak(reversed, TODAY, min) === base && computeStreak(doubled, TODAY, min) === base
      }),
      { numRuns: 200 },
    )
  })
})