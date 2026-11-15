// Plays the shared scenario one day at a time through every module.
// Pure: the start time is passed in, nothing reads the clock, nothing is logged.
import { buildScenario } from './scenario.js'
import { defineModule, runModules } from '../engine/adapter.js'
import { evaluate as evaluateRadiation } from '../modules/radiation/radiation-engine.js'
import environment from '../modules/environment/index.js'
import isolation from '../modules/isolation/index.js'
import gravity from '../modules/gravity/index.js'
import nutrition from '../modules/nutrition/index.js'

export const SCENARIO_START_MS = 1_700_000_000_000
export const MODULE_DOMAINS = ['radiation', 'isolation', 'gravity', 'environment', 'nutrition']

/** Alerts for day `dayNumber` (1 to 14): the engine sees the readings of days 1..dayNumber only. */
export function playDay(days, dayNumber, cutoffs) {
  const today = days[dayNumber - 1]
  const byDomain = {}
  for (const d of days.slice(0, dayNumber)) {
    for (const r of d.readings) ((byDomain[r.domain] ??= {})[r.indicator] ??= []).push(r)
  }
  const radiation = defineModule({
    name: 'radiation',
    domain: 'radiation',
    kind: 'function',
    run: () => [...evaluateRadiation(today.radiation)],
  })
  const result = runModules([radiation, isolation, gravity, environment, nutrition], byDomain, {
    cutoffs,
    now: today.timestamp,
  })
  return { day: dayNumber, ...result }
}

export const buildDefaultScenario = () => buildScenario(SCENARIO_START_MS)
