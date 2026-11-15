import { describe, it, expect } from 'vitest'
import { buildDefaultScenario } from '../sim/playScenario.js'
import { loadCutoffs } from '../data/cutoffs.js'
import { validateAlert } from '../engine/validateAlert.js'
import mapping from '../data/regionMapping.json'
import { groupByRegion, computeRegionStatus } from '../ui/regionStatus.js'
import { scenarioDashboardData } from './scenarioPlayer.js'

const days = buildDefaultScenario()
const cutoffs = loadCutoffs()
const onDay = (n) => scenarioDashboardData(days, n, cutoffs)
const regions = (n) => {
  const g = groupByRegion(onDay(n).alerts, mapping)
  return Object.fromEntries(mapping.regions.map((r) => {
    const s = computeRegionStatus(g[r.id])
    return [r.id, `${s.status}${s.escalate ? ' escalate' : ''}`]
  }))
}

describe('scenarioDashboardData', () => {
  it('returns DashboardData with valid alerts, labelled with the scenario day', () => {
    for (let n = 1; n <= 14; n++) {
      const data = onDay(n)
      expect(data.status).toBe('ready')
      expect(data.scenario).toEqual({ day: n, days: 14, now: days[n - 1].timestamp })
      for (const a of data.alerts) expect(validateAlert(a)).toEqual({ ok: true })
      for (const r of mapping.regions) expect(groupByRegion(data.alerts, mapping)[r.id].length).toBeGreaterThan(0)
    }
  })

  it('holds the readings of days 1 to N only, including radiation readings', () => {
    const data = onDay(6)
    expect(data.readings['environment/cabin_co2_mmHg']).toHaveLength(6)
    expect(data.readings['radiation/proton_flux_pfu']).toHaveLength(6)
    for (const list of Object.values(data.readings)) {
      for (const r of list) expect(r.timestamp).toBeLessThanOrEqual(days[5].timestamp)
    }
  })

  it('changes the region statuses on the demo days', () => {
    expect(regions(5)).toEqual({ head_and_lungs: 'normal', bones_and_muscles: 'normal', whole_body: 'normal' })
    expect(regions(6)).toEqual({ head_and_lungs: 'watch', bones_and_muscles: 'normal', whole_body: 'watch' })
    expect(regions(8)).toEqual({ head_and_lungs: 'watch', bones_and_muscles: 'watch', whole_body: 'watch' })
    expect(regions(9)).toEqual({ head_and_lungs: 'watch', bones_and_muscles: 'watch', whole_body: 'watch' })
    expect(regions(11)).toEqual({ head_and_lungs: 'act escalate', bones_and_muscles: 'watch', whole_body: 'watch' })
    expect(regions(12)).toEqual({ head_and_lungs: 'watch', bones_and_muscles: 'watch', whole_body: 'act escalate' })
    expect(regions(14)).toEqual({ head_and_lungs: 'watch', bones_and_muscles: 'watch', whole_body: 'act escalate' })
  })

  it('day 9 adds the possible infection-like pattern to Head and lungs', () => {
    expect(onDay(8).alerts.find((a) => a.indicator === 'infection_like')).toBeUndefined()
    const p = onDay(9).alerts.find((a) => a.indicator === 'infection_like')
    expect(p).toMatchObject({ domain: 'environment', status: 'watch' })
  })

  it('day 11: Radiation is Act, urgency 63, and escalates', () => {
    const o = onDay(11).alerts.find((a) => a.indicator === 'radiation_overall')
    expect(o).toMatchObject({ status: 'act', urgency: 63, escalate: true })
  })
})
