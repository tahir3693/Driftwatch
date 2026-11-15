// Turns the shared simulated scenario into storable Readings. Pure: the start time is passed in.
import { buildScenario } from './scenario.js'
import { SYMPTOM_KEYS } from '../engine/radiationInputs.js'

/** One scenario day as Readings: its own readings plus radiation readings from day.radiation. */
export function dayReadings(day) {
  const out = day.readings.map((r) => ({ ...r }))
  const rad = day.radiation
  const add = (indicator, value) => out.push({ domain: 'radiation', indicator, timestamp: day.timestamp, value })
  add('cumulative_dose_mSv', rad.cumulativeDose_mSv)
  add('premission_dose_mSv', rad.premissionDose_mSv)
  add('proton_flux_pfu', rad.protonFlux_pfu)
  for (const key of SYMPTOM_KEYS) add(`symptom_${key}`, (rad.symptoms ?? []).includes(key) ? 1 : 0)
  return out
}

/** Every day's readings, plus radiation readings from day.radiation (dose, flux and six 1/0 symptom flags per day). */
export function scenarioReadings(startMs) {
  return buildScenario(startMs).flatMap(dayReadings)
}
