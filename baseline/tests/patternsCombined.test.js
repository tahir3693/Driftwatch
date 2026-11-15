import { describe, it, expect } from 'vitest'
import { patterns } from '../src/engine/patterns.js'
import { validateAlert } from '../src/engine/validateAlert.js'
import { runModules } from '../src/engine/adapter.js'
import { buildScenario } from '../src/sim/scenario.js'
import { loadCutoffs } from '../src/data/cutoffs.js'
import environment from '../src/modules/environment/index.js'
import environmentRules from '../src/modules/environment/rules.json'
import gravityRules from '../src/modules/gravity/rules.json'

const cutoffs = loadCutoffs()
const alert = (indicator, status) => ({
  domain: 'environment',
  indicator,
  value: 1,
  baseline: null,
  status,
  urgency: status === 'act' ? 70 : status === 'watch' ? 40 : 5,
  why: 'test',
  action: 'test',
  escalate: false,
  source: 'design value',
})
// One day of alerts from a { indicator: status } map.
const day = (map) => Object.entries(map).map(([i, s]) => alert(i, s))
const run = (defs, history, domain = 'environment') => patterns(defs, history, { domain, cutoffs })

describe('combined patterns from the real rules.json files', () => {
  const env = environmentRules.patterns

  it('infection_like fires when temperature and sleep are both in watch for 3 days', () => {
    const d = day({ body_temperature: 'watch', sleep_hours: 'watch', symptom_check: 'normal' })
    const out = run(env, [d, d, d])
    const p = out.find((a) => a.indicator === 'infection_like')
    expect(p).toBeDefined()
    expect(p.status).toBe('watch')
    expect(p.escalate).toBe(false)
    expect(p.urgency).toBe(cutoffs.watch_from)
    expect(p.why).toContain('body_temperature')
    expect(p.why).toContain('sleep_hours')
    expect(validateAlert(p)).toEqual({ ok: true })
    expect(out.find((a) => a.indicator === 'infection_like_with_symptoms')).toBeUndefined()
  })

  it('does not fire after only 2 days, or when only one indicator is in watch', () => {
    const both = day({ body_temperature: 'watch', sleep_hours: 'watch', symptom_check: 'normal' })
    const onlyTemp = day({ body_temperature: 'watch', sleep_hours: 'normal', symptom_check: 'normal' })
    expect(run(env, [both, both])).toEqual([])
    expect(run(env, [onlyTemp, onlyTemp, onlyTemp])).toEqual([])
  })

  it('does not fire when one of the 3 days breaks the run', () => {
    const both = day({ body_temperature: 'watch', sleep_hours: 'watch', symptom_check: 'normal' })
    const broken = day({ body_temperature: 'watch', sleep_hours: 'normal', symptom_check: 'normal' })
    expect(run(env, [both, broken, both])).toEqual([])
    expect(run(env, [broken, both, both])).toEqual([])
  })

  it('counts an act status the same as watch', () => {
    const d = day({ body_temperature: 'act', sleep_hours: 'watch', symptom_check: 'normal' })
    expect(run(env, [d, d, d]).some((a) => a.indicator === 'infection_like')).toBe(true)
  })

  it('infection_like_with_symptoms needs all 3 indicators, is act and escalates', () => {
    const three = day({ body_temperature: 'watch', sleep_hours: 'watch', symptom_check: 'watch' })
    const out = run(env, [three, three, three])
    const p = out.find((a) => a.indicator === 'infection_like_with_symptoms')
    expect(p).toBeDefined()
    expect(p.status).toBe('act')
    expect(p.escalate).toBe(true)
    expect(p.urgency).toBe(cutoffs.act_from)
    expect(out.some((a) => a.indicator === 'infection_like')).toBe(true)
    const two = day({ body_temperature: 'watch', sleep_hours: 'watch', symptom_check: 'normal' })
    expect(run(env, [two, two, two]).some((a) => a.indicator === 'infection_like_with_symptoms')).toBe(false)
  })

  it('gravity bone_muscle_risk fires on low exercise plus the low-intake bone note for 3 days', () => {
    const g = (map) => Object.entries(map).map(([i, s]) => ({ ...alert(i, s), domain: 'gravity' }))
    const d = g({ exercise_sessions_per_week: 'watch', low_intake_bone_note: 'watch' })
    const out = run(gravityRules.patterns, [d, d, d], 'gravity')
    expect(out).toHaveLength(1)
    expect(out[0]).toMatchObject({ domain: 'gravity', indicator: 'bone_muscle_risk', status: 'watch', escalate: false })
    expect(out[0].action).not.toMatch(/take .*supplement/i)
    const noNote = g({ exercise_sessions_per_week: 'watch', low_intake_bone_note: 'normal' })
    expect(run(gravityRules.patterns, [noNote, noNote, noNote], 'gravity')).toEqual([])
  })

  it('every pattern in every rules file names only indicators that exist', () => {
    for (const rules of [environmentRules, gravityRules]) {
      for (const [name, p] of Object.entries(rules.patterns)) {
        for (const need of p.needs) expect(rules.indicators, `${name} needs ${need}`).toHaveProperty(need)
      }
    }
  })
})

describe('combined patterns through a whole module run', () => {
  it('an act pattern raises environment_overall to act and escalates', () => {
    const START = 1_700_000_000_000
    const days = buildScenario(START)
    // headache logged on days 7 to 9 as well, so temperature, sleep and symptoms are all in watch for 3 days
    for (const d of days.slice(6, 9)) d.readings.find((r) => r.indicator === 'symptom_check').value = 1
    const upTo9 = days.slice(0, 9)
    const env = {}
    for (const d of upTo9) for (const r of d.readings) if (r.domain === 'environment') (env[r.indicator] ??= []).push(r)
    const res = runModules([environment], { environment: env }, { cutoffs, now: upTo9[8].timestamp })
    expect(res.errors).toEqual([])
    const p = res.alerts.find((a) => a.indicator === 'infection_like_with_symptoms')
    expect(p).toBeDefined()
    expect(p.status).toBe('act')
    const overall = res.alerts.find((a) => a.indicator === 'environment_overall')
    expect(overall.status).toBe('act')
    expect(overall.escalate).toBe(true)
  })
})
