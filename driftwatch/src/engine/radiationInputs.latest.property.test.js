import { describe, it } from 'vitest'
import fc from 'fast-check'
import { buildRadiationInputs, SYMPTOM_KEYS } from './radiationInputs.js'

const INDICATORS = ['cumulative_dose_mSv', 'premission_dose_mSv', 'proton_flux_pfu', ...SYMPTOM_KEYS.map((k) => `symptom_${k}`)]
// Distinct timestamps per indicator so "latest" is unambiguous.
const listArb = fc.uniqueArray(fc.integer({ min: 0, max: 1000 }), { maxLength: 12 }).chain((ts) =>
  fc.array(fc.constantFrom(0, 1, 7), { minLength: ts.length, maxLength: ts.length }).map((vals) => ts.map((t, i) => ({ timestamp: t, value: vals[i] }))),
)

// Feature: checkin, Property 8: Radiation input builder uses the latest readings
describe('buildRadiationInputs latest readings', () => {
  it('uses the latest Reading at or before now, or 0, and lists ticked symptoms in key order', () => {
    fc.assert(
      fc.property(fc.tuple(...INDICATORS.map(() => listArb)), fc.integer({ min: 0, max: 1000 }), fc.boolean(), (lists, now, flip) => {
        const by = {}
        INDICATORS.forEach((ind, i) => {
          const base = lists[i].map((r) => ({ domain: 'radiation', indicator: ind, ...r }))
          by[ind] = flip ? [...base].reverse() : base
        })
        const latest = (ind) => {
          const eligible = by[ind].filter((r) => r.timestamp <= now).sort((a, b) => a.timestamp - b.timestamp)
          return eligible.length ? eligible[eligible.length - 1].value : null
        }
        const out = buildRadiationInputs(by, now)
        const symptoms = SYMPTOM_KEYS.filter((k) => latest(`symptom_${k}`) === 1)
        return (
          out.cumulativeDose_mSv === (latest('cumulative_dose_mSv') ?? 0) &&
          out.premissionDose_mSv === (latest('premission_dose_mSv') ?? 0) &&
          out.protonFlux_pfu === (latest('proton_flux_pfu') ?? 0) &&
          JSON.stringify(out.symptoms) === JSON.stringify(symptoms)
        )
      }),
      { numRuns: 200 },
    )
  })
})