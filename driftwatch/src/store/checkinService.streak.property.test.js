import 'fake-indexeddb/auto'
import { describe, it, beforeEach, vi } from 'vitest'
import fc from 'fast-check'
import { db } from './db.js'
import { submitCheckIn } from './checkinService.js'
import { getCheckInDays } from './checkins.js'
import { computeStreak } from '../engine/streak.js'
import { dayKeyOf, dayBounds, shiftDayKey } from '../engine/dayKey.js'

const BASE = '2025-02-01'
const TODAY = shiftDayKey(BASE, 12)
const raws = {
  nutrition: fc.integer({ min: 0, max: 150 }).map((n) => ({ intake: String(n) })),
  gravity: fc.integer({ min: 0, max: 21 }).map((n) => ({ exercise: String(n) })),
}
const submitArb = fc.record({ day: fc.integer({ min: 0, max: 12 }), module: fc.constantFrom('nutrition', 'gravity'), a: raws.nutrition, b: raws.gravity })

beforeEach(async () => {
  await db.readings.clear()
  await db.checkins.clear()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

async function run(submits, pick) {
  await db.readings.clear()
  await db.checkins.clear()
  for (const s of submits) {
    const now = dayBounds(shiftDayKey(BASE, s.day)).start + 12 * 3_600_000
    await submitCheckIn({ module: s.module, raw: pick(s), now, refresh: async () => {} })
  }
  return computeStreak(await getCheckInDays(), TODAY, 1)
}

// Feature: checkin, Property 13: Streak does not depend on values or alert status
describe('streak independence', () => {
  it('gives the same streak for different values on the same days and modules', async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(submitArb, { minLength: 1, maxLength: 12 }), async (submits) => {
        const first = await run(submits, (s) => (s.module === 'nutrition' ? s.a : s.b))
        const second = await run(submits, (s) => (s.module === 'nutrition' ? { intake: '0' } : { exercise: '21' }))
        const sanity = dayKeyOf(dayBounds(TODAY).start) === TODAY
        return sanity && first === second
      }),
      { numRuns: 100 },
    )
  })
})