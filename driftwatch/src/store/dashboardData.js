// Builds the DashboardData the UI shows. Reads Dexie, runs the engine, and holds no scoring logic.
import { useCallback, useEffect, useRef, useState } from 'react'
import { getReadings } from './readings.js'
import { loadBmdState, localToday } from './bmdState.js'
import { seedScenario } from './seedScenario.js'
import { loadCutoffs } from '../data/cutoffs.js'
import { getModuleDescriptors } from '../data/moduleList.js'
import { loadIndicatorRules } from '../data/indicatorRules.js'
import regionMapping from '../data/regionMapping.json'
import { runModules } from '../engine/adapter.js'
import { computeBaseline } from '../engine/computeBaseline.js'
import { buildRadiationInputs, SYMPTOM_KEYS } from '../engine/radiationInputs.js'
import environmentRules from '../modules/environment/rules.json'
import gravityRules from '../modules/gravity/rules.json'
import nutritionRules from '../modules/nutrition/rules.json'
import isolationRules from '../modules/isolation/rules.json'

const RULES_MODULES = { environment: environmentRules, gravity: gravityRules, nutrition: nutritionRules, isolation: isolationRules }
const RADIATION_INDICATORS = [
  'cumulative_dose_mSv',
  'premission_dose_mSv',
  'proton_flux_pfu',
  ...SYMPTOM_KEYS.map((k) => `symptom_${k}`),
]
const DEFAULT_BASELINE_DAYS = 14

export const emptyDashboardData = (status = 'ready') => ({
  status,
  alerts: [],
  readings: {},
  baselineStats: {},
  rules: {},
  hasReadings: false,
})

/**
 * Reads every stored indicator, runs the modules and returns a DashboardData.
 * A Dexie read failure gives an empty, ready DashboardData (and is logged). Other errors are thrown.
 */
export async function buildDashboardData(now) {
  const rules = loadIndicatorRules()
  const readings = {}
  const readingsByDomain = {}
  try {
    for (const [domain, mod] of Object.entries(RULES_MODULES)) {
      readingsByDomain[domain] = {}
      for (const indicator of Object.keys(mod.indicators ?? {})) {
        const list = await getReadings({ domain, indicator })
        readingsByDomain[domain][indicator] = list
        readings[`${domain}/${indicator}`] = list
      }
    }
    const byIndicator = {}
    for (const indicator of RADIATION_INDICATORS) {
      const list = await getReadings({ domain: 'radiation', indicator })
      byIndicator[indicator] = list
      readings[`radiation/${indicator}`] = list
    }
    readingsByDomain.radiation = buildRadiationInputs(byIndicator, now)
  } catch (e) {
    console.error('Driftwatch: could not read stored readings', e)
    return emptyDashboardData()
  }

  const cutoffs = loadCutoffs()
  const ctx = { cutoffs, now, bmd: { state: loadBmdState(), today: localToday(new Date(now)) } }
  const { alerts, errors, warnings } = runModules(getModuleDescriptors(), readingsByDomain, ctx)
  for (const err of errors) console.error('Driftwatch module error', err)
  for (const w of warnings) console.warn('Driftwatch module warning', w)

  const mapped = new Set(regionMapping.regions.flatMap((r) => r.domains))
  const unmapped = [...new Set(alerts.filter((a) => !mapped.has(a.domain)).map((a) => a.domain))]
  if (unmapped.length) console.warn(`Driftwatch: alerts for unmapped domains: ${unmapped.join(', ')}`)

  const baselineStats = {}
  for (const [key, list] of Object.entries(readings)) {
    if (list.length < 2) continue
    const days = rules[key]?.baseline_days ?? RULES_MODULES[key.split('/')[0]]?.baseline_days ?? DEFAULT_BASELINE_DAYS
    const b = computeBaseline(list.slice(0, -1), days)
    if (b.ready) baselineStats[key] = { mean: b.mean, sd: b.sd }
  }

  return {
    status: 'ready',
    alerts,
    readings,
    baselineStats,
    rules,
    hasReadings: Object.values(readings).some((l) => l.length > 0),
  }
}

/**
 * Returns { data, refresh, loadScenario }.
 * refresh(now) rebuilds and replaces data; it rejects only when the build throws.
 * loadScenario() writes the simulated scenario into an empty store, then refreshes.
 */
export function useDashboardData() {
  const [data, setData] = useState(() => emptyDashboardData('loading'))
  const latest = useRef(0)
  const alive = useRef(true)

  const refresh = useCallback(async (now = Date.now()) => {
    const ticket = ++latest.current
    const next = await buildDashboardData(now)
    if (alive.current && ticket === latest.current) setData(next)
  }, [])

  const loadScenario = useCallback(async () => {
    const now = Date.now()
    await seedScenario(now)
    await refresh(now)
  }, [refresh])

  useEffect(() => {
    alive.current = true
    refresh().catch((e) => {
      console.error('Driftwatch: could not build dashboard data', e)
      if (alive.current) setData(emptyDashboardData())
    })
    return () => {
      alive.current = false
    }
  }, [refresh])

  return { data, refresh, loadScenario }
}
