import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import fc from 'fast-check'
import { db } from './db.js'
import { saveReading, getReadings } from './readings.js'

const DAY_MS = 86_400_000

const readingArb = fc.record({
  timestamp: fc.integer({ min: 0, max: 100 * DAY_MS }),
  value: fc.double({ min: -1000, max: 1000, noNaN: true }),
})

describe('readings store ordering and window', () => {
  beforeEach(async () => {
    await db.readings.clear()
  })

  // Feature: core, Property 2: Ordering and window
  // **Validates: Requirements 1.2, 1.3**
  it('returns readings oldest first and only those inside [now - windowDays, now]', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(readingArb, { maxLength: 30 }),
        fc.array(readingArb, { maxLength: 10 }),
        fc.integer({ min: 0, max: 100 * DAY_MS }),
        fc.integer({ min: 0, max: 60 }),
        async (target, others, now, windowDays) => {
          await db.readings.clear()
          for (const r of target) {
            await saveReading({ domain: 'radiation', indicator: 'dose', ...r })
          }
          // Readings for another indicator must never appear in the result.
          for (const r of others) {
            await saveReading({ domain: 'radiation', indicator: 'other', ...r })
          }

          // Without a window: all target readings, sorted ascending by timestamp.
          const all = await getReadings({ domain: 'radiation', indicator: 'dose' })
          expect(all).toHaveLength(target.length)
          for (let i = 1; i < all.length; i++) {
            expect(all[i - 1].timestamp).toBeLessThanOrEqual(all[i].timestamp)
          }

          // With a window: exactly the readings in the inclusive range, sorted.
          const lower = now - windowDays * DAY_MS
          const windowed = await getReadings({
            domain: 'radiation',
            indicator: 'dose',
            windowDays,
            now,
          })
          const expectedCount = target.filter(
            (r) => r.timestamp >= lower && r.timestamp <= now,
          ).length
          expect(windowed).toHaveLength(expectedCount)
          for (const r of windowed) {
            expect(r.timestamp).toBeGreaterThanOrEqual(lower)
            expect(r.timestamp).toBeLessThanOrEqual(now)
            expect(r.indicator).toBe('dose')
          }
          for (let i = 1; i < windowed.length; i++) {
            expect(windowed[i - 1].timestamp).toBeLessThanOrEqual(windowed[i].timestamp)
          }
        },
      ),
      { numRuns: 100 },
    )
  })
})
