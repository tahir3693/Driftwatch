import { describe, it, expect } from 'vitest'
import { scenarioReadings } from './scenarioReadings.js'
import { buildScenario, DAY_MS, SCENARIO_DAYS } from './scenario.js'
import { validateReading } from '../engine/validateReading.js'
import { SYMPTOM_KEYS } from '../engine/radiationInputs.js'

const START = 1_700_000_000_000
const list = scenarioReadings(START)

describe('scenarioReadings', () => {
  it('produces only valid readings', () => {
    for (const r of list) expect(validateReading(r)).toEqual({ ok: true })
  })

  it('includes every scenario reading unchanged', () => {
    const base = buildScenario(START).flatMap((d) => d.readings)
    for (const r of base) expect(list).toContainEqual(r)
  })

  it('adds nine radiation readings per day', () => {
    const rad = list.filter((r) => r.domain === 'radiation')
    expect(rad).toHaveLength(SCENARIO_DAYS * 9)
    const day11 = START + 10 * DAY_MS
    const on = (indicator) => rad.find((r) => r.indicator === indicator && r.timestamp === day11).value
    const expected = buildScenario(START)[10].radiation
    expect(on('cumulative_dose_mSv')).toBe(expected.cumulativeDose_mSv)
    expect(on('premission_dose_mSv')).toBe(expected.premissionDose_mSv)
    expect(on('proton_flux_pfu')).toBe(expected.protonFlux_pfu)
    for (const k of SYMPTOM_KEYS) expect(on(`symptom_${k}`)).toBe(expected.symptoms.includes(k) ? 1 : 0)
  })

  it('is deterministic', () => {
    expect(scenarioReadings(START)).toEqual(list)
  })
})
