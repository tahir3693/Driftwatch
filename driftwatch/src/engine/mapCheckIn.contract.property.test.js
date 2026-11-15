import { describe, it } from 'vitest'
import fc from 'fast-check'
import { mapCheckIn } from './mapCheckIn.js'
import { validateReading } from './validateReading.js'

const valuesByModule = {
  environment: fc.record({ co2: fc.double({ min: 0, max: 10, noNaN: true }), temperature: fc.double({ min: 34, max: 42, noNaN: true }), headache: fc.boolean(), nauseaFatigue: fc.boolean() }),
  radiation: fc.record({ symptoms: fc.record({ nausea: fc.boolean(), vomiting: fc.boolean(), fatigue: fc.boolean(), skin: fc.boolean(), fever: fc.boolean(), bruising: fc.boolean() }) }),
  isolation: fc.record({ sleep: fc.double({ min: 0, max: 16, noNaN: true }), mood: fc.integer({ min: 0, max: 10 }), social: fc.integer({ min: 0, max: 1440 }), reaction: fc.option(fc.integer({ min: 100, max: 2000 }), { nil: null }) }),
  gravity: fc.record({ exercise: fc.integer({ min: 0, max: 21 }) }),
  nutrition: fc.record({ intake: fc.double({ min: 0, max: 150, noNaN: true }) }),
}

// Feature: checkin, Property 5: Mapped readings satisfy the Reading contract
describe('mapCheckIn Reading contract', () => {
  it('returns Readings with four fields, timestamp = now, a finite value and validateReading ok', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...Object.keys(valuesByModule)).chain((m) => valuesByModule[m].map((v) => [m, v])),
        fc.integer({ min: 1, max: 4_000_000_000_000 }),
        fc.tuple(fc.boolean(), fc.boolean()),
        ([module, values], now, priorHeadache) => {
          const out = mapCheckIn(module, values, { now, priorHeadache })
          return (
            out.length > 0 &&
            out.every(
              (r) =>
                JSON.stringify(Object.keys(r).sort()) === JSON.stringify(['domain', 'indicator', 'timestamp', 'value']) &&
                r.timestamp === now &&
                Number.isFinite(r.value) &&
                validateReading(r).ok === true,
            )
          )
        },
      ),
      { numRuns: 300 },
    )
  })
})