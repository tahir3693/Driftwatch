import { describe, it, expect } from 'vitest'
import { DAY_MS, SCENARIO_DAYS, SIMULATED } from '../src/sim/scenario.js'
import { buildDefaultScenario, playDay, MODULE_DOMAINS } from '../src/sim/playScenario.js'
import { validateAlert } from '../src/engine/validateAlert.js'
import { loadCutoffs } from '../src/data/cutoffs.js'

const cutoffs = loadCutoffs()
const days = buildDefaultScenario()

// On day N the engine sees readings from days 1..N only.
const run = days.map((_, i) => {
  const res = playDay(days, i + 1, cutoffs)
  const find = (name) => res.alerts.find((a) => a.indicator === name)
  return { day: i + 1, res, find, overall: (domain) => find(`${domain}_overall`) }
})
const on = (day) => run[day - 1]
const status = (day, domain) => on(day).overall(domain).status

describe('shared 14-day scenario (simulated)', () => {
  it('is labelled simulated and has 14 days one day apart', () => {
    expect(SIMULATED).toBe(true)
    expect(days).toHaveLength(SCENARIO_DAYS)
    expect(days[1].timestamp - days[0].timestamp).toBe(DAY_MS)
  })

  it('uses the Radiation simulate() inputs as they are', () => {
    const flux = days.slice(8).map((d) => d.radiation.protonFlux_pfu)
    expect(flux).toEqual([60, 400, 1500, 300, 40, 12])
    expect(days[9].radiation.symptoms).toEqual(['fatigue'])
    expect(days[10].radiation.symptoms).toEqual(['fatigue', 'nausea', 'skin', 'vomiting'])
  })

  it('runs every module on every day with no errors and only valid alerts', () => {
    for (const d of run) {
      expect(d.res.errors, `day ${d.day}`).toEqual([])
      for (const a of d.res.alerts) expect(validateAlert(a)).toEqual({ ok: true })
      for (const domain of MODULE_DOMAINS) {
        expect(d.overall(domain), `day ${d.day} ${domain}_overall`).toBeDefined()
      }
    }
  })

  it('days 1 to 5: baselines form, trends bend, and no module raises an alert', () => {
    for (const day of [1, 2, 3, 4, 5]) {
      for (const domain of MODULE_DOMAINS) {
        expect(status(day, domain), `day ${day} ${domain}`).toBe('normal')
      }
    }
    const v = (d, name) => days[d].readings.find((r) => r.indicator === name).value
    expect(v(3, 'cabin_co2_mmHg')).toBeGreaterThan(v(2, 'cabin_co2_mmHg'))
    expect(v(3, 'exercise_sessions_per_week')).toBeLessThan(v(2, 'exercise_sessions_per_week'))
  })

  it('day 6: environment and isolation go to watch (headache, slower reaction check, shorter sleep)', () => {
    expect(status(5, 'environment')).toBe('normal')
    expect(status(5, 'isolation')).toBe('normal')
    expect(status(6, 'environment')).toBe('watch')
    expect(status(6, 'isolation')).toBe('watch')
    expect(on(6).find('symptom_check').status).toBe('watch')
    expect(on(6).res.alerts.find((a) => a.domain === 'isolation' && a.indicator === 'reaction_ms').status).toBe('watch')
    expect(on(6).res.alerts.find((a) => a.domain === 'isolation' && a.indicator === 'sleep_hours').status).toBe('watch')
  })

  it('day 8: nutrition goes to watch when intake falls below plan, and gravity gets the bone note', () => {
    expect(status(7, 'nutrition')).toBe('normal')
    expect(status(8, 'nutrition')).toBe('watch')
    expect(on(8).find('intake_pct_of_plan').status).toBe('watch')
    expect(status(7, 'gravity')).toBe('normal')
    expect(status(8, 'gravity')).toBe('watch')
    const note = on(8).find('low_intake_bone_note')
    expect(note.status).toBe('watch')
    expect(note.why).toMatch(/bone/i)
  })

  it('day 9: the infection-like pattern is flagged in environment', () => {
    expect(on(8).find('infection_like')).toBeUndefined()
    const p = on(9).find('infection_like')
    expect(p).toBeDefined()
    expect(p.status).toBe('watch')
    expect(p.escalate).toBe(false)
    expect(p.why).toMatch(/infection-like/i)
  })

  it('day 10: radiation score is rising but not yet act', () => {
    expect(on(10).find('solar_proton_flux').status).toBe('watch')
    expect(on(10).overall('radiation').status).not.toBe('act')
    expect(on(10).overall('radiation').urgency).toBeGreaterThanOrEqual(on(9).overall('radiation').urgency)
  })

  it('day 11: radiation is act with urgency 63 and escalates', () => {
    const o = on(11).overall('radiation')
    expect(o.status).toBe('act')
    expect(o.urgency).toBe(63)
    expect(o.escalate).toBe(true)
  })

  it('day 12: isolation combined strain is act and escalates, one day after the first signs', () => {
    expect(on(11).find('combined_strain')).toBeUndefined()
    const p = on(12).find('combined_strain')
    expect(p).toBeDefined()
    expect(p.status).toBe('act')
    expect(p.escalate).toBe(true)
    expect(p.why).toMatch(/strain/i)
    expect(p.action).toMatch(/flight surgeon or crew support/i)
    const o = on(12).overall('isolation')
    expect(o.status).toBe('act')
    expect(o.escalate).toBe(true)
  })

  it('days 12 to 14: the storm eases and radiation is below act, so it no longer escalates', () => {
    for (const day of [12, 13, 14]) {
      expect(on(day).overall('radiation').status, `day ${day}`).not.toBe('act')
      expect(on(day).overall('radiation').escalate, `day ${day}`).toBe(false)
    }
  })

  it('day 14: the ground report has a status for every module and one open escalation (isolation)', () => {
    const last = on(14)
    for (const domain of MODULE_DOMAINS) expect(last.overall(domain)).toBeDefined()
    const open = last.res.alerts.filter((a) => a.escalate).map((a) => a.indicator)
    expect(open).toContain('isolation_overall')
    expect(status(14, 'environment')).toBe('watch')
    expect(status(14, 'gravity')).toBe('watch')
    expect(status(14, 'nutrition')).toBe('watch')
  })

  it('isolation text says strain, never uses diagnostic words, and calls the task a reaction check', () => {
    const isolationAlerts = on(12).res.alerts.filter((a) => a.domain === 'isolation')
    const text = isolationAlerts.map((a) => `${a.why} ${a.action}`).join(' ').toLowerCase()
    expect(text).toContain('strain')
    expect(text).toMatch(/flight surgeon|crew support/)
    expect(text).not.toMatch(/depress|anxiety|disorder|psychosis|diagnos/)
    expect(text).not.toMatch(/reaction test|reaction time test/)
  })
})
