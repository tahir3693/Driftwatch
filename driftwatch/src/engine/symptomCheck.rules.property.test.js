import { describe, it } from 'vitest'
import fc from 'fast-check'
import { deriveSymptomCode } from './symptomCheck.js'

// Feature: checkin, Property 7: Symptom code follows the rule table
describe('symptom code rules', () => {
  it('follows the rule table, stays in 0..2 and never drops when a prior flag turns on', () => {
    fc.assert(
      fc.property(fc.boolean(), fc.boolean(), fc.boolean(), fc.boolean(), (headache, nauseaFatigue, p1, p2) => {
        const code = deriveSymptomCode({ headache, nauseaFatigue }, [p1, p2])
        let expected = 0
        if (nauseaFatigue || (headache && p1 && p2)) expected = 2
        else if (headache && p1 !== p2) expected = 1
        if (code !== expected || ![0, 1, 2].includes(code)) return false
        return deriveSymptomCode({ headache, nauseaFatigue }, [true, p2]) >= deriveSymptomCode({ headache, nauseaFatigue }, [false, p2])
      }),
      { numRuns: 200 },
    )
  })
})