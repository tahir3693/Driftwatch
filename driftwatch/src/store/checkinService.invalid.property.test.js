import 'fake-indexeddb/auto'
import { describe, it, beforeEach } from 'vitest'
import fc from 'fast-check'
import { db } from './db.js'
import { saveReading } from './readings.js'
import { submitCheckIn } from './checkinService.js'

const NOW = 1_800_000_000_000
const BAD = fc.constantFrom('', 'abc', '99999', '-1', '1.5x', '0x10')
const rawByModule = {
  environment: fc.record({ co2: BAD, headache: fc.constantFrom(null, true), nauseaFatigue: fc.constantFrom(null, false), temperature: fc.constantFrom('36', '50') }),
  isolation: fc.record({ sleep: BAD, mood: fc.constantFrom('3', '11'), social: fc.constantFrom('30', ''), reaction: fc.constantFrom('', '50') }),
  gravity: fc.record({ exercise: BAD }),
  nutrition: fc.record({ intake: BAD }),
}

beforeEach(async () => {
  await db.readings.clear()
  await db.checkins.clear()
})

// Feature: checkin, Property 16: Invalid submit leaves the store unchanged
describe('invalid submit', () => {
  it('returns invalid and leaves both tables unchanged', async () => {
    await saveReading({ domain: 'nutrition', indicator: 'intake_pct_of_plan', timestamp: NOW - 5, value: 80 })
    await db.checkins.add({ dayKey: '2025-01-01', module: 'gravity', submittedAt: 1, readingIds: [] })
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...Object.keys(rawByModule)).chain((m) => rawByModule[m].map((raw) => [m, raw])),
        async ([module, raw]) => {
          const before = JSON.stringify([await db.readings.toArray(), await db.checkins.toArray()])
          const res = await submitCheckIn({ module, raw, now: NOW, refresh: async () => {} })
          const after = JSON.stringify([await db.readings.toArray(), await db.checkins.toArray()])
          return res.status === 'invalid' && res.errors.length > 0 && before === after
        },
      ),
      { numRuns: 100 },
    )
  })
})