import { describe, it, expect } from 'vitest'
import rules from './rules.json'
import cutoffs from '../../data/cutoffs.json'
import { validateRules } from '../../engine/validateRules.js'
import { validateAlert } from '../../engine/validateAlert.js'
import { bmdAlerts } from './bmdAdapter.js'

// 2025-01-15 is a Wednesday (week Monday 13 to Sunday 19 January).
const TODAY = '2025-01-15'
const BASE = { id: 'b', created: 1, date: '2025-01-01', baseline: true, hip: 1.0, lumbar: 1.0, deadlift: 100, bench: 100 }
const TRAINED = Object.fromEntries(['2025-01-13', '2025-01-14', '2025-01-15'].map((d) => [d, { strength: true, endurance: true }]))
const latest = (key, value) => ({ id: key, created: 2, date: '2025-01-10', baseline: false, [key]: value })

// One measure per indicator, with the latest value as a ratio of a baseline of 1.0 or 100.
const ratioAlert = (key, indicator, ratio) => {
  const scale = BASE[key]
  const state = { measurements: [BASE, latest(key, ratio * scale)], weeklyWorkouts: TRAINED }
  return bmdAlerts(state, { today: TODAY, cutoffs }).find((a) => a.indicator === indicator)
}
// Strength training ticked on the first `done` days of the week only.
const missedAlert = (today, done) => {
  const weekly = Object.fromEntries(done.map((d) => [d, { strength: true }]))
  return bmdAlerts({ measurements: [], weeklyWorkouts: weekly }, { today, cutoffs })
    .find((a) => a.indicator === 'strength_training_missed_days')
}

describe('bmd-strength rules', () => {
  it('passes validateRules and keeps domain gravity', () => {
    expect(validateRules(rules, 'bmd-strength')).toBe(true)
    expect(rules.domain).toBe('gravity')
    expect(rules.storage_key).toBe('orbit-journal-v1')
  })

  it('holds the tracker limits as data', () => {
    const { bmd_ratio: bmd, strength_ratio: strength, missed_training_days: missed } = rules.indicators
    expect(bmd.bands).toEqual({ normal: { value_min: 0.98 }, watch: { value_min: 0.95, value_max: 0.98 }, act: { value_max: 0.95 } })
    expect(strength.bands).toEqual({ normal: { value_min: 0.9 }, watch: { value_min: 0.8, value_max: 0.9 }, act: { value_max: 0.8 } })
    expect(missed.bands).toEqual({ normal: { value_max: 2 }, watch: { value_min: 2, value_max: 4 }, act: { value_min: 4 } })
  })

  it('maps BMD ratio to Normal, Watch and Act', () => {
    const normal = ratioAlert('hip', 'hip_bmd', 0.99)
    const watch = ratioAlert('lumbar', 'lumbar_spine_bmd', 0.96)
    const act = ratioAlert('hip', 'hip_bmd', 0.9)
    expect([normal.status, watch.status, act.status]).toEqual(['normal', 'watch', 'act'])
    expect([normal.escalate, watch.escalate, act.escalate]).toEqual([false, false, true])
    for (const a of [normal, watch, act]) {
      expect(validateAlert(a)).toEqual({ ok: true })
      expect(a.source).toContain('NASA OCHMO-TB-030')
    }
  })

  it('maps strength ratio to Normal, Watch and Act', () => {
    const normal = ratioAlert('deadlift', 'deadlift_strength', 0.95)
    const watch = ratioAlert('bench', 'bench_press_strength', 0.85)
    const act = ratioAlert('deadlift', 'deadlift_strength', 0.7)
    expect([normal.status, watch.status, act.status]).toEqual(['normal', 'watch', 'act'])
    expect(act.escalate).toBe(true)
    for (const a of [normal, watch, act]) {
      expect(validateAlert(a)).toEqual({ ok: true })
      expect(a.source).toBe('design value')
    }
  })

  it('maps missed training days up to today to Normal, Watch and Act', () => {
    const normal = missedAlert(TODAY, ['2025-01-13', '2025-01-14']) // 1 missed (Wed)
    const watch = missedAlert(TODAY, ['2025-01-13']) // 2 missed (Tue, Wed)
    const act = missedAlert('2025-01-16', ['2025-01-01']) // 4 missed (Mon to Thu)
    expect([normal.value, watch.value, act.value]).toEqual([1, 2, 4])
    expect([normal.status, watch.status, act.status]).toEqual(['normal', 'watch', 'act'])
    expect(act.escalate).toBe(true)
    for (const a of [normal, watch, act]) {
      expect(validateAlert(a)).toEqual({ ok: true })
      expect(a.source).toBe('design value')
    }
  })

  it('keeps the tracker edges: a ratio exactly at the watch limit is Watch', () => {
    expect(ratioAlert('hip', 'hip_bmd', 0.98).status).toBe('watch')
    expect(ratioAlert('hip', 'hip_bmd', 0.95).status).toBe('watch')
    expect(ratioAlert('bench', 'bench_press_strength', 0.9).status).toBe('watch')
    expect(ratioAlert('bench', 'bench_press_strength', 0.8).status).toBe('watch')
  })

  it('reads its limits from the rules passed in', () => {
    const stricter = structuredClone(rules)
    stricter.indicators.bmd_ratio.bands.act.value_max = 0.97
    const state = { measurements: [BASE, latest('hip', 0.96)], weeklyWorkouts: TRAINED }
    const a = bmdAlerts(state, { today: TODAY, cutoffs, rules: stricter }).find((x) => x.indicator === 'hip_bmd')
    expect(a.status).toBe('act')
    expect(a.why).toContain('below the 97% limit')
  })

  it('says "possible" and refers to the flight surgeon in every Watch and Act text', () => {
    for (const rule of Object.values(rules.indicators)) {
      for (const t of [rule, rule.messages.watch]) {
        expect(t.why).toMatch(/possible/)
        expect(t.action).toMatch(/flight surgeon/)
      }
      expect(rule.messages.normal.action).toMatch(/flight surgeon/)
      expect(rule.messages.no_data.action).toMatch(/flight surgeon/)
    }
  })

  it('has help text for every indicator and never tells anyone to take supplements', () => {
    for (const rule of Object.values(rules.indicators)) {
      expect(rule.howToMeasure.length).toBeGreaterThan(0)
      expect(rule.whyItMatters.length).toBeGreaterThan(0)
    }
    const text = JSON.stringify(rules).toLowerCase()
    expect(text).not.toMatch(/supplement/)
    expect(text).not.toMatch(/diagnosed|you have osteoporosis/)
  })
})
