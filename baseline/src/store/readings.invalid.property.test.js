import 'fake-indexeddb/auto'
import { beforeEach, describe, it } from 'vitest'
import fc from 'fast-check'
import { db } from './db.js'
import { saveReading, getReadings, ReadingValidationError } from './readings.js'
import { DOMAINS } from '../data/domains.js'

const validReading = fc.record({
  domain: fc.constantFrom(...DOMAINS),
  indicator: fc.string({ minLength: 1, maxLength: 12 }),
  timestamp: fc.integer({ min: 0, max: 2_000_000_000_000 }),
  value: fc.double({ noNaN: true, noDefaultInfinity: true }),
})

// One invalid reading with exactly one broken field, plus the field expected in the error.
const invalidReading = validReading.chain((base) =>
  fc.oneof(
    fc
      .string()
      .filter((s) => !DOMAINS.includes(s))
      .map((domain) => ({ reading: { ...base, domain }, field: 'domain' })),
    fc.constantFrom(undefined, null, '').map((timestamp) => ({
      reading: { ...base, timestamp },
      field: 'timestamp',
    })),
    fc.constant({
      reading: (({ timestamp, ...rest }) => rest)(base), // eslint-disable-line no-unused-vars
      field: 'timestamp',
    }),
    fc.constantFrom(undefined, null, '').map((indicator) => ({
      reading: { ...base, indicator },
      field: 'indicator',
    })),
    fc.constant({
      reading: (({ indicator, ...rest }) => rest)(base), // eslint-disable-line no-unused-vars
      field: 'indicator',
    }),
    fc
      .oneof(
        fc.constantFrom(undefined, null, NaN, Infinity, -Infinity),
        fc.string(),
        fc.boolean(),
      )
      .map((value) => ({ reading: { ...base, value }, field: 'value' })),
  ),
)

beforeEach(async () => {
  await db.readings.clear()
})

describe('readings store invalid input (property)', () => {
  // Feature: core, Property 3: Invalid readings are rejected with the field named
  // **Validates: Requirements 1.4, 1.5**
  it('rejects every invalid reading naming the field and leaves the store unchanged', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(validReading, { maxLength: 4 }),
        invalidReading,
        async (seed, { reading, field }) => {
          await db.readings.clear()
          for (const s of seed) await saveReading(s)
          const before = await db.readings.toArray()

          let error
          try {
            await saveReading(reading)
          } catch (e) {
            error = e
          }
          if (!(error instanceof ReadingValidationError)) return false
          if (error.field !== field) return false
          if (typeof error.message !== 'string' || error.message.length === 0) return false

          const after = await db.readings.toArray()
          return JSON.stringify(after) === JSON.stringify(before)
        },
      ),
      { numRuns: 100 },
    )
    // getReadings stays usable after rejections
    await getReadings({ domain: 'radiation', indicator: 'x' })
  })
})
