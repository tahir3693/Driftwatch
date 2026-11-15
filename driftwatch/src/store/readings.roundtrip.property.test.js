import 'fake-indexeddb/auto'
import { beforeEach, describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { db } from './db.js'
import { saveReading, getReadings } from './readings.js'
import { DOMAINS } from '../data/domains.js'

// Feature: core, Property 1: Reading round trip
// Validates: Requirements 1.1, 1.6

beforeEach(async () => {
  await db.readings.clear()
})

const readingArb = fc.record({
  domain: fc.constantFrom(...DOMAINS),
  indicator: fc.string({ minLength: 1, maxLength: 20 }),
  timestamp: fc.integer({ min: 0, max: 4_000_000_000_000 }),
  value: fc.double({ noNaN: true, noDefaultInfinity: true }),
})

describe('Property 1: Reading round trip', () => {
  it('a saved valid reading is returned unchanged and without id', async () => {
    await fc.assert(
      fc.asyncProperty(readingArb, async (reading) => {
        await db.readings.clear()
        const id = await saveReading(reading)
        expect(typeof id).toBe('number')
        const out = await getReadings({
          domain: reading.domain,
          indicator: reading.indicator,
        })
        expect(out).toEqual([reading])
        expect(out[0]).not.toHaveProperty('id')
      }),
      { numRuns: 100 },
    )
  })
})
