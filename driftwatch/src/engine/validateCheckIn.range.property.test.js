import { describe, it } from 'vitest'
import fc from 'fast-check'
import { validateCheckIn } from './validateCheckIn.js'

const rangeArb = fc
  .record({ min: fc.integer({ min: -500, max: 500 }), span: fc.integer({ min: 1, max: 500 }), integer: fc.boolean(), unit: fc.constantFrom('', 'h', 'mmHg') })
  .map(({ min, span, integer, unit }) => ({ label: 'Thing', unit, min, max: min + span, integer, source: 'design value' }))

const fmt = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(2))

// Feature: checkin, Property 1: Validation accepts exactly the in-range numbers
describe('validation range property', () => {
  it('reports no error for the field iff min <= n <= max (and whole when required)', () => {
    fc.assert(
      fc.property(rangeArb, fc.double({ min: -1100, max: 1100, noNaN: true, noDefaultInfinity: true }), (range, x) => {
        const text = fmt(Math.round(x * 100) / 100)
        const n = Number(text)
        const ranges = { intake: range }
        const res = validateCheckIn('nutrition', { intake: text }, ranges)
        const expected = n >= range.min && n <= range.max && (!range.integer || Number.isInteger(n))
        return res.ok === expected
      }),
      { numRuns: 300 },
    )
  })
})