import { describe, it } from 'vitest'
import fc from 'fast-check'
import { validateCheckIn } from './validateCheckIn.js'

const rangeArb = fc
  .record({ min: fc.integer({ min: -500, max: 500 }), span: fc.integer({ min: 1, max: 500 }), integer: fc.boolean(), unit: fc.constantFrom('', 'h', 'mmHg'), label: fc.constantFrom('Sleep', 'Food intake', 'Thing') })
  .map(({ min, span, integer, unit, label }) => ({ label, unit, min, max: min + span, integer, source: 'design value' }))

const NUMBER = /^[+-]?(\d+\.?\d*|\.\d+)$/
const msg = (range, text) => validateCheckIn('nutrition', { intake: text }, { intake: range }).errors?.[0]?.message

// Feature: checkin, Property 2: Validation error messages follow the fixed templates
describe('validation message templates', () => {
  it('uses the exact template for empty, non-number and non-whole inputs', () => {
    fc.assert(
      fc.property(rangeArb, fc.constantFrom('', ' ', '   ', '\t'), fc.string().filter((s) => s.trim() !== '' && !NUMBER.test(s.trim())), (range, blank, junk) => {
        return msg(range, blank) === `Enter a value for ${range.label}.` && msg(range, junk) === `${range.label} must be a number.`
      }),
      { numRuns: 200 },
    )
  })
  it('names the label, bounds and unit for an out-of-range number and says whole number for a decimal', () => {
    fc.assert(
      fc.property(rangeArb, fc.integer({ min: 1, max: 50 }), (range, d) => {
        const out = msg(range, String(range.max + d))
        const unit = range.unit ? ` ${range.unit}` : ''
        const bounds = `${range.label} must be from ${range.min} to ${range.max}${unit}.`
        if (out !== bounds) return false
        if (range.integer) {
          const mid = `${range.min}.5`
          if (msg(range, mid) !== `${range.label} must be a whole number.`) return false
        }
        return !/normal|abnormal/i.test(out)
      }),
      { numRuns: 200 },
    )
  })
  it('says Choose yes or no for any unanswered yes or no field', () => {
    const ranges = { co2: { label: 'C', unit: '', min: 0, max: 9, integer: false }, temperature: { label: 'T', unit: '', min: 0, max: 99, integer: false } }
    fc.assert(
      fc.property(fc.constantFrom(null, undefined, 'yes', 1, 0, ''), fc.constantFrom(null, undefined, 'no'), (a, b) => {
        const e = validateCheckIn('environment', { co2: '1', headache: a, nauseaFatigue: b, temperature: '5' }, ranges).errors
        return e.length === 2 && e.every((x) => x.message === 'Choose yes or no.')
      }),
      { numRuns: 100 },
    )
  })
})