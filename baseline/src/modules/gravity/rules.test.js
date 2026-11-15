import { describe, it, expect } from 'vitest'
import rules from './rules.json'
import cutoffs from '../../data/cutoffs.json'
import { validateRules } from '../../engine/validateRules.js'
import { validateAlert } from '../../engine/validateAlert.js'
import { evaluate } from '../../engine/evaluate.js'

const DAY = 86_400_000
const run = (indicator, values) => {
  const readings = values.map((value, i) => ({ timestamp: (i + 1) * DAY, domain: 'gravity', indicator, value }))
  return evaluate(rules.indicators[indicator], readings, {
    now: values.length * DAY,
    cutoffs,
    domain: 'gravity',
    indicator,
  })
}

describe('gravity rules', () => {
  it('passes validateRules', () => {
    expect(validateRules(rules, 'gravity')).toBe(true)
  })

  it('maps weekly exercise sessions to Normal, Watch and Act', () => {
    const normal = run('exercise_sessions_per_week', [6])
    const watch = run('exercise_sessions_per_week', [5])
    const act = run('exercise_sessions_per_week', [3])
    expect([normal.status, watch.status, act.status]).toEqual(['normal', 'watch', 'act'])
    expect(act.escalate).toBe(true)
    for (const a of [normal, watch, act]) expect(validateAlert(a)).toEqual({ ok: true })
    expect(normal.source).toContain('NASA OCHMO-TB-030')
  })

  it('maps orthostatic symptom codes to Normal, Watch and Act', () => {
    const statuses = [0, 1, 2].map((v) => run('orthostatic_symptoms', [v]).status)
    expect(statuses).toEqual(['normal', 'watch', 'act'])
  })

  it('adds a bone note when low intake is logged', () => {
    expect(run('low_intake_bone_note', [0]).status).toBe('normal')
    const note = run('low_intake_bone_note', [1])
    expect(note.status).toBe('watch')
    expect(note.why).toContain('bone')
    expect(rules.patterns.bone_muscle_risk.needs).toContain('low_intake_bone_note')
  })

  it('never tells anyone to take supplements', () => {
    const text = JSON.stringify(rules).toLowerCase()
    expect(text).not.toMatch(/take (a |some )?supplement/)
  })
})
