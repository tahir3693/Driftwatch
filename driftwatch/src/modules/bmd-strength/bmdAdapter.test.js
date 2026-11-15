import { describe, it, expect } from 'vitest'
import { bmdAlerts, weekDates, missedTrainingDays, gravityOverall } from './bmdAdapter.js'
import { validateAlert } from '../../engine/validateAlert.js'
import { runModules } from '../../engine/adapter.js'
import gravity from '../gravity/index.js'
import gravityRules from '../gravity/rules.json'
import cutoffs from '../../data/cutoffs.json'

// 2025-01-15 is a Wednesday. Its week runs from Monday 13 to Sunday 19 January.
const TODAY = '2025-01-15'
const run = (state) => bmdAlerts(state, { today: TODAY, cutoffs })
const byIndicator = (alerts) => Object.fromEntries(alerts.map((a) => [a.indicator, a]))

const baseline = { id: 'b', created: 1, date: '2025-01-01', baseline: true, hip: 1.0, lumbar: 1.2, deadlift: 100, bench: 60 }
const reading = (date, key, value, created = 10) => ({
  id: `${key}-${date}`, created, date, baseline: false, hip: null, lumbar: null, deadlift: null, bench: null, [key]: value,
})
// Every day up to today checked for both training types, so training is Normal.
const trainedWeek = {
  '2025-01-13': { strength: true, endurance: true },
  '2025-01-14': { strength: true, endurance: true },
  '2025-01-15': { strength: true, endurance: true },
}
const stateWith = (...readings) => ({ measurements: [baseline, ...readings], weeklyWorkouts: trainedWeek, unit: 'kg' })

const INDICATORS = [
  'hip_bmd', 'lumbar_spine_bmd', 'deadlift_strength', 'bench_press_strength',
  'strength_training_missed_days', 'endurance_training_missed_days', 'gravity_overall',
]

function expectContract(alerts) {
  expect(alerts.map((a) => a.indicator)).toEqual(INDICATORS)
  for (const a of alerts) {
    expect(validateAlert(a)).toEqual({ ok: true })
    expect(a.domain).toBe('gravity')
    expect(Object.keys(a)).toHaveLength(10)
  }
}

describe('bmdAlerts: empty state', () => {
  it.each([
    ['null', null],
    ['undefined', undefined],
    ['empty object', {}],
    ['nothing saved yet', { measurements: [], workouts: [], unit: 'kg', weeklyWorkouts: {} }],
  ])('returns Normal alerts with no baseline for %s', (_name, state) => {
    const alerts = run(state)
    expectContract(alerts)
    for (const a of alerts) {
      expect(a.status).toBe('normal')
      expect(a.urgency).toBe(0)
      expect(a.escalate).toBe(false)
      expect(a.baseline).toBeNull()
    }
    expect(byIndicator(alerts).hip_bmd.why).toMatch(/no hip bmd baseline/i)
  })

  it('gives no comparison when readings exist but no baseline is set', () => {
    const a = byIndicator(run({ measurements: [reading('2025-01-10', 'hip', 0.5)], weeklyWorkouts: trainedWeek })).hip_bmd
    expect(a.status).toBe('normal')
    expect(a.value).toBe(0.5)
    expect(a.baseline).toBeNull()
  })
})

describe('bmdAlerts: normal', () => {
  it('is Normal when every value is above the upper limit and training is up to date', () => {
    const alerts = run(stateWith(reading('2025-01-10', 'hip', 0.99), reading('2025-01-10', 'deadlift', 95)))
    expectContract(alerts)
    const a = byIndicator(alerts)
    expect(a.hip_bmd).toMatchObject({ status: 'normal', value: 0.99, baseline: 1.0, urgency: 0, escalate: false })
    expect(a.deadlift_strength).toMatchObject({ status: 'normal', value: 95, baseline: 100 })
    // With only the baseline recorded, the latest value is the baseline itself (100%).
    expect(a.lumbar_spine_bmd).toMatchObject({ status: 'normal', value: 1.2, baseline: 1.2 })
    expect(a.strength_training_missed_days).toMatchObject({ status: 'normal', value: 0 })
    expect(a.gravity_overall).toMatchObject({ status: 'normal', urgency: 0, escalate: false, value: 0 })
  })
})

describe('bmdAlerts: watch (yellow)', () => {
  it('maps BMD from 95% to 98% of baseline to Watch, inclusive of both limits', () => {
    for (const hip of [0.95, 0.965, 0.98]) {
      const a = byIndicator(run(stateWith(reading('2025-01-10', 'hip', hip)))).hip_bmd
      expect(a.status).toBe('watch')
      expect(a.urgency).toBeGreaterThanOrEqual(cutoffs.watch_from)
      expect(a.urgency).toBeLessThan(cutoffs.act_from)
      expect(a.escalate).toBe(false)
    }
  })

  it('maps strength from 80% to 90% of baseline to Watch', () => {
    const a = byIndicator(run(stateWith(reading('2025-01-10', 'bench', 51)))).bench_press_strength
    expect(a).toMatchObject({ status: 'watch', value: 51, baseline: 60, source: 'design value' })
  })

  it('says "possible" and defers to the flight surgeon', () => {
    const a = byIndicator(run(stateWith(reading('2025-01-10', 'lumbar', 1.17)))).lumbar_spine_bmd
    expect(a.status).toBe('watch')
    expect(a.why).toMatch(/possible bone loss/)
    expect(a.action).toMatch(/flight surgeon/)
  })

  it('maps 2 or 3 missed training days up to today to Watch', () => {
    const state = stateWith()
    state.weeklyWorkouts = { '2025-01-15': { strength: true } } // Mon and Tue missed
    const a = byIndicator(run(state)).strength_training_missed_days
    expect(a).toMatchObject({ status: 'watch', value: 2, baseline: null, source: 'design value' })
    expect(a.why).toMatch(/possible/)
  })
})

describe('bmdAlerts: act (red)', () => {
  it('maps BMD below 95% of baseline to Act and escalates', () => {
    const alerts = run(stateWith(reading('2025-01-10', 'hip', 0.9)))
    expectContract(alerts)
    const a = byIndicator(alerts)
    expect(a.hip_bmd.status).toBe('act')
    expect(a.hip_bmd.urgency).toBeGreaterThanOrEqual(cutoffs.act_from)
    expect(a.hip_bmd.urgency).toBeLessThanOrEqual(100)
    expect(a.hip_bmd.escalate).toBe(true)
    expect(a.hip_bmd.source).toContain('NASA OCHMO-TB-030')
    expect(a.hip_bmd.why).toMatch(/possible bone loss/)
    expect(a.hip_bmd.action).toMatch(/flight surgeon/)
    expect(a.gravity_overall).toMatchObject({ status: 'act', escalate: true, urgency: a.hip_bmd.urgency, value: 1 })
    expect(a.gravity_overall.why).toBe(a.hip_bmd.why)
  })

  it('maps strength below 80% of baseline to Act', () => {
    const a = byIndicator(run(stateWith(reading('2025-01-10', 'deadlift', 79)))).deadlift_strength
    expect(a).toMatchObject({ status: 'act', escalate: true, source: 'design value' })
    expect(a.why).toMatch(/possible loss of muscle strength/)
  })

  it('uses the latest reading and the latest baseline', () => {
    const newBaseline = { ...baseline, id: 'b2', created: 2, date: '2025-01-05', hip: 0.8 }
    const state = stateWith(reading('2025-01-03', 'hip', 0.5), reading('2025-01-12', 'hip', 0.78), newBaseline)
    const a = byIndicator(run(state)).hip_bmd
    expect(a).toMatchObject({ value: 0.78, baseline: 0.8, status: 'watch' })
  })

  it('maps 4 or more missed training days up to today to Act', () => {
    const state = stateWith()
    state.weeklyWorkouts = { '2025-01-01': { strength: true } }
    const a = byIndicator(bmdAlerts(state, { today: '2025-01-17', cutoffs })).strength_training_missed_days // Friday
    expect(a).toMatchObject({ status: 'act', value: 5, escalate: true })
    expect(a.action).toMatch(/flight surgeon/)
  })

  it('marks only the BMD limits with the NASA source', () => {
    const a = byIndicator(run(stateWith()))
    expect(a.hip_bmd.source).toMatch(/NASA OCHMO-TB-030.*95%.*98% limit is a design value/)
    expect(a.lumbar_spine_bmd.source).toBe(a.hip_bmd.source)
    for (const k of ['deadlift_strength', 'bench_press_strength', 'strength_training_missed_days', 'endurance_training_missed_days', 'gravity_overall']) {
      expect(a[k].source).toBe('design value')
    }
  })
})

describe('training alarm counts only days up to today (future-day bug fix)', () => {
  it('lists Monday to Sunday of the current week', () => {
    expect(weekDates(TODAY)).toEqual([
      '2025-01-13', '2025-01-14', '2025-01-15', '2025-01-16', '2025-01-17', '2025-01-18', '2025-01-19',
    ])
    expect(weekDates('2025-01-13')[0]).toBe('2025-01-13')
    expect(weekDates('2025-01-19')[0]).toBe('2025-01-13')
  })

  it('does not count the unchecked future days of the week', () => {
    // Mon to Wed are all checked; Thu to Sun are still in the future and unchecked.
    // The old rule counted 4 unchecked days and raised a red alarm on Wednesday.
    const state = { measurements: [], weeklyWorkouts: trainedWeek }
    expect(missedTrainingDays(state, 'strength', TODAY)).toBe(0)
    const a = byIndicator(run(state))
    expect(a.strength_training_missed_days).toMatchObject({ status: 'normal', value: 0 })
    expect(a.endurance_training_missed_days).toMatchObject({ status: 'normal', value: 0 })
    expect(a.gravity_overall.status).toBe('normal')
  })

  it('counts today when it is unchecked', () => {
    const state = { measurements: [], weeklyWorkouts: { '2025-01-13': { strength: true } } }
    expect(missedTrainingDays(state, 'strength', TODAY)).toBe(2) // Tue and Wed
    expect(missedTrainingDays(state, 'strength', '2025-01-13')).toBe(0) // Monday: only Monday counts
    expect(missedTrainingDays(state, 'strength', '2025-01-19')).toBe(6) // Sunday: the whole week counts
  })

  it('the tracker app applies the same rule', async () => {
    const { readFileSync } = await import('node:fs')
    const { join, dirname } = await import('node:path')
    const { fileURLToPath } = await import('node:url')
    const here = dirname(fileURLToPath(import.meta.url))
    const app = readFileSync(join(here, '..', '..', '..', 'public', 'bmd-strength', 'app.js'), 'utf8')
    expect(app).toContain('dates.filter(date=>date<=today()&&!state.weeklyWorkouts[date]?.[type])')
    expect(app).not.toContain('resetVersion')
    const css = readFileSync(join(here, '..', '..', '..', 'public', 'bmd-strength', 'style.css'), 'utf8')
    expect(css).not.toMatch(/fonts\.googleapis|@import/)
  })
})

describe('gravityOverall', () => {
  it('is Normal with urgency 0 for no alerts', () => {
    const o = gravityOverall([], cutoffs)
    expect(validateAlert(o)).toEqual({ ok: true })
    expect(o).toMatchObject({ indicator: 'gravity_overall', status: 'normal', urgency: 0, escalate: false })
  })
})

describe('gravity module descriptor', () => {
  const DAY = 86_400_000
  const now = Date.UTC(2025, 0, 15, 12)

  it('keeps every rules.json indicator, adds the tracker alerts and returns one gravity_overall', () => {
    const { alerts, errors } = runModules([gravity], {}, { cutoffs, now, bmd: { state: stateWith(reading('2025-01-10', 'hip', 0.9)), today: TODAY } })
    expect(errors).toEqual([])
    const names = alerts.map((a) => a.indicator)
    for (const k of Object.keys(gravityRules.indicators)) expect(names).toContain(k)
    for (const k of INDICATORS) expect(names).toContain(k)
    expect(names.filter((n) => n === 'gravity_overall')).toHaveLength(1)
    expect(names.at(-1)).toBe('gravity_overall')
    const overall = alerts.at(-1)
    expect(overall).toMatchObject({ status: 'act', escalate: true })
  })

  it('combines rules and tracker status in gravity_overall', () => {
    const readings = {
      exercise_sessions_per_week: [{ timestamp: now - DAY, domain: 'gravity', indicator: 'exercise_sessions_per_week', value: 5 }],
    }
    const { alerts } = runModules([gravity], { gravity: readings }, { cutoffs, now })
    const o = alerts.find((a) => a.indicator === 'gravity_overall')
    expect(o.status).toBe('watch')
    expect(alerts.find((a) => a.indicator === 'hip_bmd').status).toBe('normal')
  })

  it('works without tracker data (scenario and tests)', () => {
    const { alerts, errors } = runModules([gravity], {}, { cutoffs, now })
    expect(errors).toEqual([])
    expect(alerts.at(-1)).toMatchObject({ indicator: 'gravity_overall', status: 'normal' })
  })
})
