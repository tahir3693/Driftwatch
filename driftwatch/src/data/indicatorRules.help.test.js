import { describe, it, expect } from 'vitest'
import { loadIndicatorRules, HELP_FALLBACK } from './indicatorRules.js'
import { buildDefaultScenario, playDay } from '../sim/playScenario.js'
import { loadCutoffs } from './cutoffs.js'
import { engineAlerts } from '../modules/bmd-strength/engineAdapter.js'
import environmentRules from '../modules/environment/rules.json'
import { alertCardModel } from '../ui/alertModel.js'

const rules = loadIndicatorRules()
const cutoffs = loadCutoffs()
const days = buildDefaultScenario()
const scenarioKeys = new Set(days.flatMap((_, i) => playDay(days, i + 1, cutoffs).alerts.map((a) => `${a.domain}/${a.indicator}`)))
const trackerKeys = engineAlerts({ measurements: [], weeklyWorkouts: {} }, { today: '2025-01-15', cutoffs }).map((a) => `${a.domain}/${a.indicator}`)
const OVERALLS = ['radiation', 'environment', 'isolation', 'gravity', 'nutrition'].map((d) => `${d}/${d}_overall`).concat('gravity/bmd_strength_overall')
const PATTERNS = ['environment/infection_like', 'environment/infection_like_with_symptoms', 'isolation/combined_strain', 'gravity/bone_muscle_risk']

describe('help text fallback (help.json)', () => {
  it('gives every alert of the 14-day scenario and the tracker how to measure, why it matters and a source', () => {
    for (const key of new Set([...scenarioKeys, ...trackerKeys, ...OVERALLS, ...PATTERNS])) {
      const m = alertCardModel({ domain: key.split('/')[0], indicator: key.split('/')[1], status: 'normal', urgency: 0, value: null, baseline: null, why: '', action: '', source: '', escalate: false }, rules[key])
      expect(m.howToMeasure, key).not.toBe('Not available')
      expect(m.whyItMatters, key).not.toBe('Not available')
      expect(rules[key].source, key).toEqual(expect.any(String))
    }
  })

  it('uses the suggested wording for the radiation alerts and the overall alerts', () => {
    expect(rules['radiation/cumulative_dose'].whyItMatters).toBe('Radiation dose adds up over a career. NASA requires the career total to stay under 600 mSv.')
    expect(rules['radiation/cumulative_dose'].source).toBe('NASA-STD-3001 Vol 1 Rev C (V1 4030) via NASA OCHMO-TB-020')
    expect(rules['radiation/symptom_check_in'].source).toBe('design value')
    expect(rules['radiation/solar_proton_flux'].source).toBe('NOAA SWPC S-scale; points per level are a design value')
    for (const key of OVERALLS) {
      expect(rules[key].howToMeasure, key).toBe("Calculated by the app from this module's indicators; you do not measure it.")
      expect(rules[key].whyItMatters, key).toMatch(/flight surgeon/)
      expect(rules[key].source, key).toBe('design value')
    }
  })

  it('never overrides text that rules.json has', () => {
    const t = environmentRules.indicators.body_temperature
    expect(rules['environment/body_temperature'].howToMeasure).toBe(t.howToMeasure)
    expect(rules['environment/body_temperature'].whyItMatters).toBe(t.whyItMatters)
  })

  it('says "possible" for health effects and never diagnoses', () => {
    const text = JSON.stringify(HELP_FALLBACK)
    expect(text).not.toMatch(/diagnos|you have|osteoporosis|radiation sickness/i)
    for (const file of Object.values(HELP_FALLBACK)) {
      for (const h of Object.values(file.indicators)) {
        if (/\b(sign|risk)\b/i.test(h.whyItMatters)) expect(h.whyItMatters).toMatch(/possible/i)
      }
    }
  })
})
