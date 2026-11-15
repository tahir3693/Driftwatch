// Plays the shared simulated 14-day scenario in memory and turns each day into DashboardData,
// so the body map, the detail views and the ground report show the scenario day by day.
// Nothing is written to storage; Reset returns the screens to the stored data.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { buildDefaultScenario, playDay } from '../sim/playScenario.js'
import { SCENARIO_DAYS } from '../sim/scenario.js'
import { dayReadings } from '../sim/scenarioReadings.js'
import { loadCutoffs } from '../data/cutoffs.js'
import { loadIndicatorRules } from '../data/indicatorRules.js'
import { baselineStatsFor } from './dashboardData.js'

export const STEP_MS = 1500

/**
 * DashboardData for scenario day `dayNumber` (1 to 14). Pure.
 * Alerts come from playDay (the engine sees days 1..dayNumber only); readings are the same days.
 */
export function scenarioDashboardData(days, dayNumber, cutoffs, rules = loadIndicatorRules()) {
  const { alerts } = playDay(days, dayNumber, cutoffs)
  const readings = {}
  for (const day of days.slice(0, dayNumber)) {
    for (const r of dayReadings(day)) (readings[`${r.domain}/${r.indicator}`] ??= []).push(r)
  }
  return {
    status: 'ready',
    alerts,
    readings,
    baselineStats: baselineStatsFor(readings, rules),
    rules,
    hasReadings: true,
    scenario: { day: dayNumber, days: SCENARIO_DAYS, now: days[dayNumber - 1].timestamp },
  }
}

/**
 * Scenario player state. Returns { day, playing, finished, data, now, play, pause, next, reset }.
 * day 0 means not started (data is null, so the screens show the stored data).
 */
export function useScenarioPlayer(stepMs = STEP_MS) {
  const days = useMemo(() => buildDefaultScenario(), [])
  const cutoffs = useMemo(() => loadCutoffs(), [])
  const rules = useMemo(() => loadIndicatorRules(), [])
  const [day, setDay] = useState(0)
  const [playing, setPlaying] = useState(false)
  const finished = day >= SCENARIO_DAYS

  useEffect(() => {
    if (!playing) return undefined
    const id = setInterval(() => setDay((d) => Math.min(SCENARIO_DAYS, d + 1)), stepMs)
    return () => clearInterval(id)
  }, [playing, stepMs])

  useEffect(() => {
    if (finished) setPlaying(false)
  }, [finished])

  const data = useMemo(() => (day > 0 ? scenarioDashboardData(days, day, cutoffs, rules) : null), [day, days, cutoffs, rules])

  const play = useCallback(() => {
    setDay((d) => (d >= SCENARIO_DAYS ? 0 : d))
    setPlaying(true)
  }, [])
  const pause = useCallback(() => setPlaying(false), [])
  const next = useCallback(() => setDay((d) => Math.min(SCENARIO_DAYS, d + 1)), [])
  const reset = useCallback(() => {
    setPlaying(false)
    setDay(0)
  }, [])

  return { day, playing, finished, data, now: data?.scenario.now ?? null, play, pause, next, reset }
}
