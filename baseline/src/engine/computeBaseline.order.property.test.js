import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { computeBaseline } from './computeBaseline.js'

const DAY_MS = 86_400_000

// One reading per timestamp, as in real data (one value per indicator per day).
const readingsArb = fc.uniqueArray(
  fc.record({
    timestamp: fc.integer({ min: 0, max: 60 }).map((d) => d * DAY_MS),
    value: fc.double({ min: -1000, max: 1000, noNaN: true, noDefaultInfinity: true }),
  }),
  { selector: (r) => r.timestamp, minLength: 0, maxLength: 40 },
)

describe('computeBaseline order independence', () => {
  // Feature: core, Property 5: Baseline is order independent
  // **Validates: Requirements 2.6**
  it('returns identical results for any permutation of the readings', () => {
    fc.assert(
      fc.property(
        readingsArb.chain((readings) =>
          fc.record({
            readings: fc.constant(readings),
            shuffled: fc.shuffledSubarray(readings, {
              minLength: readings.length,
              maxLength: readings.length,
            }),
            windowDays: fc.integer({ min: 1, max: 60 }),
          }),
        ),
        ({ readings, shuffled, windowDays }) => {
          expect(computeBaseline(shuffled, windowDays)).toEqual(
            computeBaseline(readings, windowDays),
          )
        },
      ),
      { numRuns: 200 },
    )
  })
})
