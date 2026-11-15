import { describe, it } from 'vitest'
import fc from 'fast-check'
import { validateCheckIn } from './validateCheckIn.js'
import { loadCheckinRanges } from '../data/checkinData.js'

const ranges = loadCheckinRanges()
const ORDER = ['sleep', 'mood', 'social', 'reaction']
const maybe = (good) => fc.oneof(good, fc.constantFrom('', 'abc', '9999', '-5', '1.5'))
const GOOD = { sleep: '7', mood: '4', social: '60', reaction: '300' }

// Feature: checkin, Property 4: Invalid input produces errors in form order and no values
describe('error order', () => {
  it('lists only invalid fields, once each, in form order, with no values', () => {
    fc.assert(
      fc.property(maybe(fc.constant(GOOD.sleep)), maybe(fc.constant(GOOD.mood)), maybe(fc.constant(GOOD.social)), maybe(fc.constant(GOOD.reaction)), (sleep, mood, social, reaction) => {
        const raw = { sleep, mood, social, reaction }
        const r = validateCheckIn('isolation', raw, ranges)
        const solo = (f) => validateCheckIn('isolation', { ...GOOD, [f]: raw[f] }, ranges).ok
        const invalid = ORDER.filter((f) => !solo(f) && !(f === 'reaction' && raw[f] === ''))
        if (invalid.length === 0) return r.ok === true
        if (r.ok !== false || 'values' in r) return false
        const fields = r.errors.map((e) => e.field)
        return JSON.stringify(fields) === JSON.stringify(invalid) && new Set(fields).size === fields.length
      }),
      { numRuns: 300 },
    )
  })
})