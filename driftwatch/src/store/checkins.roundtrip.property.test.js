import 'fake-indexeddb/auto'
import { describe, it, beforeEach } from 'vitest'
import fc from 'fast-check'
import { db } from './db.js'
import { getReadings } from './readings.js'
import { saveCheckIn } from './checkins.js'
import { mapCheckIn } from '../engine/mapCheckIn.js'
import { dayKeyOf } from '../engine/dayKey.js'

const valuesByModule = {
  environment: fc.record({ co2: fc.double({ min: 0, max: 10, noNaN: true }), temperature: fc.double({ min: 34, max: 42, noNaN: true }), headache: fc.boolean(), nauseaFatigue: fc.boolean() }),
  radiation: fc.record({ symptoms: fc.record({ nausea: fc.boolean(), vomiting: fc.boolean(), fatigue: fc.boolean(), skin: fc.boolean(), fever: fc.boolean(), bruising: fc.boolean() }) }),
  isolation: fc.record({ sleep: fc.double({ min: 0, max: 16, noNaN: true }), mood: fc.integer({ min: 0, max: 10 }), social: fc.integer({ min: 0, max: 1440 }), reaction: fc.option(fc.integer({ min: 100, max: 2000 }), { nil: null }) }),
  gravity: fc.record({ exercise: fc.integer({ min: 0, max: 21 }) }),
  nutrition: fc.record({ intake: fc.double({ min: 0, max: 150, noNaN: true }) }),
}

beforeEach(async () => {
  await db.readings.clear()
  await db.checkins.clear()
})

// Feature: checkin, Property 14: Save and read back round trip
describe('saveCheckIn round trip', () => {
  it('reads back exactly the mapped Readings', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...Object.keys(valuesByModule)).chain((m) => valuesByModule[m].map((v) => [m, v])),
        fc.integer({ min: 1_000_000_000_000, max: 2_000_000_000_000 }),
        async ([module, values], now) => {
          await db.readings.clear()
          await db.checkins.clear()
          const readings = mapCheckIn(module, values, { now, priorHeadache: [false, false] })
          await saveCheckIn({ module, dayKey: dayKeyOf(now), now, readings })
          for (const r of readings) {
            const back = await getReadings({ domain: r.domain, indicator: r.indicator })
            if (back.length !== 1 || JSON.stringify(back[0]) !== JSON.stringify({ domain: r.domain, indicator: r.indicator, timestamp: r.timestamp, value: r.value })) {
              if (!(back.length === 1 && back[0].timestamp === r.timestamp && back[0].value === r.value && back[0].domain === r.domain && back[0].indicator === r.indicator)) return false
            }
          }
          return (await db.readings.count()) === readings.length
        },
      ),
      { numRuns: 100 },
    )
  })
})