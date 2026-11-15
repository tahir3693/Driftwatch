import { describe, it, expect } from 'vitest'
import rules from './rules.json'
import cutoffs from '../../data/cutoffs.json'
import { validateRules } from '../../engine/validateRules.js'
import { validateAlert } from '../../engine/validateAlert.js'
import { evaluate } from '../../engine/evaluate.js'

const DAY = 86_400_000
const run = (indicator, values) => {
  const readings = values.map((value, i) => ({ timestamp: (i + 1) * DAY, domain: 'environment', indicator, value }))
  return evaluate(rules.indicators[indicator], readings, {
    now: values.length * DAY,
    cutoffs,
    domain: 'environment',
    indicator,
  })
}

describe('environment rules', () => {
  it('passes validateRules', () => {
    expect(validateRules(rules, 'environment')).toBe(true)
  })

  it('maps cabin CO2 to Normal, Watch and Act', () => {
    const normal = run('cabin_co2_mmHg', [2.0])
    const watch = run('cabin_co2_mmHg', [2.9])
    const act = run('cabin_co2_mmHg', [3.4])
    expect([normal.status, watch.status, act.status]).toEqual(['normal', 'watch', 'act'])
    expect(act.escalate).toBe(true)
    expect(normal.escalate).toBe(false)
    for (const a of [normal, watch, act]) expect(validateAlert(a)).toEqual({ ok: true })
    expect(act.source).toContain('NASA OCHMO-TB-004')
  })

  it('maps the symptom check codes to Normal, Watch and Act', () => {
    const statuses = [0, 1, 2].map((v) => run('symptom_check', [v]).status)
    expect(statuses).toEqual(['normal', 'watch', 'act'])
  })

  it('flags temperature that is more than 2 standard deviations above baseline as Watch', () => {
    const base = [36.5, 36.6, 36.4, 36.5, 36.6, 36.4, 36.5]
    expect(run('body_temperature', [...base, 36.5]).status).toBe('normal')
    expect(run('body_temperature', [...base, 38.5]).status).toBe('watch')
  })

  it('defines the infection-like patterns from existing indicators', () => {
    expect(rules.patterns.infection_like.needs).toEqual(['body_temperature', 'sleep_hours'])
    expect(rules.patterns.infection_like_with_symptoms.result).toBe('act')
    expect(rules.patterns.infection_like_with_symptoms.escalate).toBe(true)
  })
})
