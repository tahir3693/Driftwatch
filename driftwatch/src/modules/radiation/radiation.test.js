import { describe, it, expect } from 'vitest'
import { evaluate, simulate, RULES } from './radiation-engine.js'
import { evaluate as evaluateModule } from './index.js'
import descriptor from './index.js'
import rulesJson from './rules.json'
import { validateAlert } from '../../engine/validateAlert.js'
import { validateRules } from '../../engine/validateRules.js'

const overall = (alerts) => alerts.find((a) => a.indicator === 'radiation_overall')
const quiet = { cumulativeDose_mSv: 150, premissionDose_mSv: 120, protonFlux_pfu: 1, symptoms: [] }

describe('radiation module', () => {
  it('day 1 of simulate() is normal', () => {
    const alerts = evaluateModule(simulate()[0])
    expect(overall(alerts).status).toBe('normal')
    expect(overall(alerts).escalate).toBe(false)
  })

  it('day 11 gives radiation_overall urgency 63, status act and escalate true', () => {
    const day11 = simulate().find((d) => d.day === 11)
    const o = overall(evaluateModule(day11))
    expect(o.urgency).toBe(63)
    expect(o.status).toBe('act')
    expect(o.escalate).toBe(true)
  })

  it('a cumulative dose of 600 mSv or more gives urgency of at least 90 and escalates', () => {
    for (const dose of [600, 750]) {
      const o = overall(evaluateModule({ ...quiet, cumulativeDose_mSv: dose }))
      expect(o.urgency).toBeGreaterThanOrEqual(90)
      expect(o.escalate).toBe(true)
    }
  })

  it('vomiting during an S2 or higher flux escalates', () => {
    for (const flux of [100, 1000, 1e5]) {
      const alerts = evaluateModule({ ...quiet, protonFlux_pfu: flux, symptoms: ['vomiting'] })
      expect(overall(alerts).escalate).toBe(true)
      expect(alerts.find((a) => a.indicator === 'symptom_check_in').escalate).toBe(true)
    }
    const s1 = evaluateModule({ ...quiet, protonFlux_pfu: 60, symptoms: ['vomiting'] })
    expect(s1.find((a) => a.indicator === 'symptom_check_in').escalate).toBe(false)
  })

  it('an empty or missing symptom list does not throw', () => {
    expect(() => evaluateModule({ ...quiet, symptoms: [] })).not.toThrow()
    const { symptoms, ...noList } = quiet
    expect(() => evaluateModule(noList)).not.toThrow()
  })

  it('returns exactly the four contract objects, all valid', () => {
    const alerts = evaluateModule(simulate()[10])
    expect(alerts.map((a) => a.indicator)).toEqual([
      'cumulative_dose',
      'symptom_check_in',
      'solar_proton_flux',
      'radiation_overall',
    ])
    for (const a of alerts) {
      expect(a.domain).toBe('radiation')
      expect(validateAlert(a)).toEqual({ ok: true })
    }
    expect(alerts.parts).toBeUndefined()
  })

  it('uses one action per indicator and status', () => {
    const watchDose = evaluate({ ...quiet, cumulativeDose_mSv: 200 }).find((a) => a.indicator === 'cumulative_dose')
    expect(watchDose.status).toBe('watch')
    expect(watchDose.action).toBe('Review your remaining dose budget with the ground team.')
    const actFlux = evaluate({ ...quiet, protonFlux_pfu: 1500 }).find((a) => a.indicator === 'solar_proton_flux')
    expect(actFlux.action).toBe("Follow your mission's solar particle event and shelter procedure, and tell the flight surgeon.")
  })

  it('cites V1 4030 for the career limit', () => {
    const dose = evaluate(quiet).find((a) => a.indicator === 'cumulative_dose')
    expect(dose.source).toContain('[V1 4030]')
  })

  it('exposes speDesignRef_mSv and no longer speLimit_mSv', () => {
    expect(RULES.speDesignRef_mSv).toBe(250)
    expect(RULES.speLimit_mSv).toBeUndefined()
  })

  it('rules.json matches the engine numbers and marks design values', () => {
    expect(validateRules(rulesJson, 'radiation')).toBe(true)
    expect(rulesJson.official.career_effective_dose_mSv.value).toBe(RULES.careerLimit_mSv)
    expect(rulesJson.official.spe_design_reference_mSv.value).toBe(RULES.speDesignRef_mSv)
    expect(rulesJson.official.spe_design_reference_mSv.meaning).toBe(
      'NASA design requirement for a reference solar particle event',
    )
    const d = rulesJson.design_values
    expect(d.max_points).toMatchObject(RULES.maxPoints)
    for (const [k, v] of Object.entries(RULES.symptoms)) expect(d.symptom_points[k]).toBe(v.pts)
    for (const [from, pts, level] of RULES.weatherSteps.filter((s) => s[0] > 0)) {
      expect(d.flux_steps_pfu_10MeV_and_above[level]).toEqual({ from_pfu: from, points: pts })
    }
    expect(d.urgency_cutoffs).toMatchObject({ watch_from: RULES.bands.watch, act_from: RULES.bands.act })
    expect(d.escalate_at_fraction_of_career_dose.value).toBe(RULES.escalateAtFraction)
    for (const key of ['max_points', 'symptom_points', 'flux_steps_pfu_10MeV_and_above', 'urgency_cutoffs', 'escalate_at_fraction_of_career_dose', 'quiet_flux_reference_pfu']) {
      expect(d[key].source).toBe('design value')
    }
  })

  it('exports a frozen function-module descriptor', () => {
    expect(Object.isFrozen(descriptor)).toBe(true)
    expect(descriptor).toMatchObject({ name: 'radiation', domain: 'radiation', kind: 'function' })
  })
})
