import { describe, it, expect } from 'vitest'
import rules from './rules.json'
import cutoffs from '../../data/cutoffs.json'
import { validateRules } from '../../engine/validateRules.js'
import { validateAlert } from '../../engine/validateAlert.js'
import { evaluate } from '../../engine/evaluate.js'

const DAY = 86_400_000
const run = (indicator, values) => {
  const readings = values.map((value, i) => ({ timestamp: (i + 1) * DAY, domain: 'nutrition', indicator, value }))
  return evaluate(rules.indicators[indicator], readings, {
    now: values.length * DAY,
    cutoffs,
    domain: 'nutrition',
    indicator,
  })
}

describe('nutrition rules', () => {
  it('passes validateRules', () => {
    expect(validateRules(rules, 'nutrition')).toBe(true)
  })

  it('maps intake against plan to Normal, Watch and Act', () => {
    const normal = run('intake_pct_of_plan', [95])
    const watch = run('intake_pct_of_plan', [85])
    const act = run('intake_pct_of_plan', [70])
    expect([normal.status, watch.status, act.status]).toEqual(['normal', 'watch', 'act'])
    expect(act.escalate).toBe(true)
    for (const a of [normal, watch, act]) expect(validateAlert(a)).toEqual({ ok: true })
    expect(normal.source).toBe('design value')
  })

  it('treats vitamin D below 35 ng/mL as Watch and at or above 35 as Normal', () => {
    expect(run('vitamin_d_ng_ml', [50]).status).toBe('normal')
    expect(run('vitamin_d_ng_ml', [35]).status).toBe('normal')
    const low = run('vitamin_d_ng_ml', [30])
    expect(low.status).toBe('watch')
    expect(low.action).not.toMatch(/supplement/i)
  })
})
