import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { computeBaseline } from './computeBaseline.js'

const DAY_MS = 86_400_000
const NOW = 1_700_000_000_000
const WINDOW_DAYS = 14

// Readings whose timestamps all fall inside [NOW - 14 days, NOW].
const readingsArb = fc.array(
  fc.record({
    timestamp: fc.integer({ min: NOW - WINDOW_DAYS * DAY_MS, max: NOW }),
    value: fc.double({ min: -1000, max: 1000, noNaN: true, noDefaultInfinity: true }),
  }),
  { minLength: 0, maxLength: 40 },
)

function referenceStats(values) {
  const n = values.length
  const m = values.reduce((a, b) => a + b, 0) / n
  const variance = values.reduce((a, v) => a + (v - m) ** 2, 0) / (n - 1)
  return { mean: m, sd: Math.sqrt(variance) }
}

describe('computeBaseline properties', () => {
  // Feature: core, Property 4: Baseline statistics and readiness
  // **Validates: Requirements 2.1, 2.2**
  it('is ready with reference mean and sample sd when n >= 5, otherwise not ready without mean or sd', () => {
    fc.assert(
      fc.property(readingsArb, (readings) => {
        const result = computeBaseline(readings, WINDOW_DAYS, { now: NOW })
        expect(result.n).toBe(readings.length)
        if (readings.length >= 5) {
          const ref = referenceStats(readings.map((r) => r.value))
          expect(result.ready).toBe(true)
          expect(result.mean).toBeCloseTo(ref.mean, 6)
          expect(result.sd).toBeCloseTo(ref.sd, 6)
        } else {
          expect(result.ready).toBe(false)
          expect('mean' in result).toBe(false)
          expect('sd' in result).toBe(false)
        }
      }),
      { numRuns: 200 },
    )
  })
})
