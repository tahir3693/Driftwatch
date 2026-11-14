import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { urgency, statusFromUrgency, statusRank } from './urgency.js'

// Valid cutoffs: 1 <= watch_from < act_from <= 100
const cutoffsArb = fc
  .integer({ min: 1, max: 99 })
  .chain((w) => fc.integer({ min: w + 1, max: 100 }).map((a) => ({ watch_from: w, act_from: a })))

const statusArb = fc.constantFrom('normal', 'watch', 'act')
const severityArb = fc.oneof(
  fc.double({ min: -5, max: 5, noNaN: true }),
  fc.constantFrom(NaN, Infinity, -Infinity, 0, 1)
)

describe('urgency mapping properties', () => {
  // Feature: core, Property 17: Urgency range and cut-off mapping
  // **Validates: Requirements 5.3, 5.4, 5.5, 5.6, 5.9**
  it('urgency is in 0..100 and maps back to the alert status', () => {
    fc.assert(
      fc.property(statusArb, severityArb, cutoffsArb, (status, severity, cutoffs) => {
        const u = urgency({ status }, { severity, cutoffs })
        expect(Number.isInteger(u)).toBe(true)
        expect(u).toBeGreaterThanOrEqual(0)
        expect(u).toBeLessThanOrEqual(100)
        expect(statusFromUrgency(u, cutoffs)).toBe(status)
      }),
      { numRuns: 200 }
    )
  })

  // Feature: core, Property 17: Urgency range and cut-off mapping
  it('statusFromUrgency follows the cut-offs and its rank never decreases', () => {
    fc.assert(
      fc.property(cutoffsArb, (cutoffs) => {
        let prevRank = -1
        for (let u = 0; u <= 100; u++) {
          const s = statusFromUrgency(u, cutoffs)
          const expected =
            u < cutoffs.watch_from ? 'normal' : u < cutoffs.act_from ? 'watch' : 'act'
          expect(s).toBe(expected)
          const r = statusRank(s)
          expect(r).toBeGreaterThanOrEqual(prevRank)
          prevRank = r
        }
      }),
      { numRuns: 200 }
    )
  })
})
