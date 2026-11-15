import 'fake-indexeddb/auto'
import { describe, it, beforeEach } from 'vitest'
import fc from 'fast-check'
import { db } from './db.js'
import { saveReading, getReadings } from './readings.js'
import { saveCheckIn } from './checkins.js'
import { mapCheckIn } from '../engine/mapCheckIn.js'
import { dayBounds } from '../engine/dayKey.js'

const DAY = '2025-03-10'
const START = dayBounds(DAY).start

beforeEach(async () => {
  await db.readings.clear()
  await db.checkins.clear()
})

// Feature: checkin, Property 15: Resubmit replaces and leaves one set per day
describe('resubmit replaces', () => {
  it('leaves one record, one Reading per indicator equal to the last submit, and other rows unchanged', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.record({ sleep: fc.integer({ min: 0, max: 16 }), mood: fc.integer({ min: 0, max: 10 }), social: fc.integer({ min: 0, max: 1440 }), reaction: fc.option(fc.integer({ min: 100, max: 2000 }), { nil: null }) }), { minLength: 1, maxLength: 5 }),
        async (submits) => {
          await db.readings.clear()
          await db.checkins.clear()
          // Rows that must never change: same day other-source Reading, another day, another module.
          const other = [
            { domain: 'isolation', indicator: 'mood', timestamp: START + 1000, value: 5 },
            { domain: 'isolation', indicator: 'mood', timestamp: START - 3_600_000, value: 6 },
          ]
          for (const o of other) await saveReading(o)
          await saveCheckIn({ module: 'gravity', dayKey: DAY, now: START + 500, readings: [{ domain: 'gravity', indicator: 'exercise_sessions_per_week', timestamp: START + 500, value: 3 }] })
          let last
          for (let i = 0; i < submits.length; i++) {
            const now = START + 2_000_000 + i * 1000
            last = mapCheckIn('isolation', submits[i], { now })
            await saveCheckIn({ module: 'isolation', dayKey: DAY, now, readings: last })
          }
          const records = (await db.checkins.toArray()).filter((r) => r.module === 'isolation' && r.dayKey === DAY)
          if (records.length !== 1) return false
          for (const r of last) {
            const rows = (await getReadings({ domain: r.domain, indicator: r.indicator })).filter((x) => x.timestamp >= START + 2_000_000)
            if (rows.length !== 1 || rows[0].value !== r.value || rows[0].timestamp !== r.timestamp) return false
          }
          const moods = (await getReadings({ domain: 'isolation', indicator: 'mood' })).filter((x) => x.timestamp < START + 2_000_000).map((x) => x.value)
          const gravity = await getReadings({ domain: 'gravity', indicator: 'exercise_sessions_per_week' })
          return JSON.stringify(moods) === JSON.stringify([6, 5]) && gravity.length === 1 && gravity[0].value === 3
        },
      ),
      { numRuns: 100 },
    )
  })
})