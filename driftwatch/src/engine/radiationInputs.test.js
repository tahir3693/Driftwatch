import { describe, it, expect } from 'vitest'
import { buildRadiationInputs } from './radiationInputs.js'

const r = (indicator, timestamp, value) => ({ domain: 'radiation', indicator, timestamp, value })

describe('buildRadiationInputs', () => {
  it('uses the latest value, whatever the list order', () => {
    const out = buildRadiationInputs({ cumulative_dose_mSv: [r('cumulative_dose_mSv', 30, 12), r('cumulative_dose_mSv', 10, 5)] }, 100)
    expect(out.cumulativeDose_mSv).toBe(12)
  })
  it('ignores a Reading after now', () => {
    const out = buildRadiationInputs({ proton_flux_pfu: [r('proton_flux_pfu', 10, 40), r('proton_flux_pfu', 200, 900)] }, 100)
    expect(out.protonFlux_pfu).toBe(40)
  })
  it('takes the last in the list for equal timestamps', () => {
    const out = buildRadiationInputs({ premission_dose_mSv: [r('premission_dose_mSv', 10, 1), r('premission_dose_mSv', 10, 2)] }, 10)
    expect(out.premissionDose_mSv).toBe(2)
  })
  it('gives 0 for a missing dose or flux', () => {
    const out = buildRadiationInputs({}, 100)
    expect([out.cumulativeDose_mSv, out.premissionDose_mSv, out.protonFlux_pfu]).toEqual([0, 0, 0])
  })
  it('lists symptoms in the fixed order when the latest value is 1', () => {
    const by = {
      symptom_skin: [r('symptom_skin', 5, 1)],
      symptom_nausea: [r('symptom_nausea', 5, 1)],
      symptom_fever: [r('symptom_fever', 1, 1), r('symptom_fever', 9, 0)],
      symptom_bruising: [r('symptom_bruising', 5, 1)],
      symptom_vomiting: [r('symptom_vomiting', 5, 0)],
    }
    expect(buildRadiationInputs(by, 100).symptoms).toEqual(['nausea', 'skin', 'bruising'])
  })
  it('handles an empty or missing input', () => {
    const empty = { cumulativeDose_mSv: 0, premissionDose_mSv: 0, protonFlux_pfu: 0, symptoms: [] }
    expect(buildRadiationInputs({}, 0)).toEqual(empty)
    expect(buildRadiationInputs(undefined, 0)).toEqual(empty)
  })
})
