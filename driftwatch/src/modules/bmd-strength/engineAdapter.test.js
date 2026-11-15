import { describe, it, expect } from 'vitest'
import {
  engineAlerts,
  workoutsThisWeek,
  PARAMETERS,
  BMD_SOURCE,
  STRENGTH_SOURCE,
  WORKOUTS_SOURCE,
  BMD_STRENGTH_OVERALL,
} from './engineAdapter.js'
import { evaluate } from './teammate-engine/BMD_and_strength_engine.js'
import { validateAlert } from '../../engine/validateAlert.js'
import { runModules } from '../../engine/adapter.js'
import gravity from '../gravity/index.js'
import gravityRules from '../gravity/rules.json'
import cutoffs from '../../data/cutoffs.json'

// 2025-01-15 is a Wednesday. Its week runs from Monday 13 to Sunday 19 January.
const WED = '2025-01-15'
const SUN = '2025-01-19'
const WEEK = ['2025-01-13', '2025-01-14', '2025-01-15', '2025-01-16', '2025-01-17', '2025-01-18', '2025-01-19']

const baseline = { id: 'b', created: 1, date: '2025-01-01', baseline: true, hip: 1.0, lumbar: 1.2, deadlift: 100, bench: 60 }
const reading = (key, value, created = 10) => ({
  id: `${key}-${created}`, created, date: '2025-01-10', baseline: false, hip: null, lumbar: null, deadlift: null, bench: null, [key]: value,
})
// Strength training ticked on the first `n` days of the week.
const trained = (n) => Object.fromEntries(WEEK.slice(0, n).map((d) => [d, { strength: true }]))
const stateWith = (days, ...readings) => ({ measurements: [baseline, ...readings], weeklyWorkouts: trained(days), unit: 'kg' })
const run = (state, today = SUN, c = cutoffs) => engineAlerts(state, { today, cutoffs: c })
const by = (alerts) => Object.fromEntries(alerts.map((a) => [a.indicator, a]))

const INDICATORS = [
  'hip_bmd', 'lumbar_spine_bmd', 'bench_press_strength', 'deadlift_strength', 'workouts_this_week', BMD_STRENGTH_OVERALL,
]

function expectContract(alerts) {
  expect(alerts.map((a) => a.indicator)).toEqual(INDICATORS)
  for (const a of alerts) {
    expect(validateAlert(a)).toEqual({ ok: true })
    expect(a.domain).toBe('gravity')
    expect(Object.keys(a)).toHaveLength(10)
    expect(a.status).toBe(a.status.toLowerCase())
    expect(typeof a.escalate).toBe('boolean')
  }
}

describe('engineAlerts: contract', () => {
  it('goes through the four parameters in the order Hip, Spine, Benchpress, Deadlift', () => {
    expect(PARAMETERS.map((p) => p.engine)).toEqual(['Hip', 'Spine', 'Benchpress', 'Deadlift'])
  })

  it('returns exactly the 10 fields for every alert, with the value a ratio to the baseline', () => {
    const alerts = run(stateWith(7, reading('hip', 0.99), reading('bench', 54)))
    expectContract(alerts)
    const a = by(alerts)
    expect(a.hip_bmd).toMatchObject({ value: 0.99, baseline: 1 })
    expect(a.bench_press_strength).toMatchObject({ value: 0.9, baseline: 60 })
    for (const k of ['hip_bmd', 'lumbar_spine_bmd', 'bench_press_strength', 'deadlift_strength']) {
      expect(typeof a[k].value).toBe('number')
      expect(typeof a[k].baseline).toBe('number')
    }
    expect(a.workouts_this_week).toMatchObject({ value: 7, baseline: null })
  })

  it('calls the engine evaluate with the latest reading and the tracker baseline', () => {
    const alerts = run(stateWith(7, reading('hip', 0.9)))
    const [, direct] = evaluate({
      registered_week_workouts: 7, registered_value: 0.9, baseline_value: 1.0, baseline_indicator: 'Hip',
    })
    expect(by(alerts).hip_bmd.urgency).toBe(direct.urgency)
    expect(by(alerts).hip_bmd.baseline).toBe(direct.baseline)
  })
})

describe('engineAlerts: normal', () => {
  it('is Normal when every value is above its watch limit and 6 or 7 days are trained', () => {
    for (const days of [6, 7]) {
      const alerts = run(stateWith(days, reading('hip', 0.99), reading('deadlift', 95)))
      expectContract(alerts)
      for (const a of alerts) {
        expect(a).toMatchObject({ status: 'normal', urgency: 0, escalate: false })
      }
      expect(by(alerts)[BMD_STRENGTH_OVERALL]).toMatchObject({ value: 0 })
    }
  })

  it('treats the baseline itself as the latest reading (ratio 1)', () => {
    expect(by(run(stateWith(7))).lumbar_spine_bmd).toMatchObject({ value: 1, baseline: 1.2, status: 'normal' })
  })
})

describe('engineAlerts: watch', () => {
  it('maps BMD between the Act and Watch limits to Watch without escalating', () => {
    const a = by(run(stateWith(7, reading('hip', 0.96)))).hip_bmd
    expect(a).toMatchObject({ status: 'watch', urgency: 50, escalate: false, value: 0.96 })
    expect(a.why).toMatch(/possible bone loss/)
    expect(a.action).toMatch(/flight surgeon/)
  })

  it('maps strength between 80% and 90% of baseline to Watch', () => {
    const a = by(run(stateWith(7, reading('bench', 51)))).bench_press_strength
    expect(a).toMatchObject({ status: 'watch', urgency: 50, escalate: false, value: 0.85 })
    expect(a.why).toMatch(/possible loss of muscle strength/)
  })

  it('maps 4 or 5 trained days to Watch', () => {
    for (const days of [4, 5]) {
      const a = by(run(stateWith(days))).workouts_this_week
      expect(a).toMatchObject({ status: 'watch', urgency: 50, escalate: false, value: days })
      expect(a.why).toMatch(/possible/)
      expect(a.action).toMatch(/flight surgeon/)
    }
  })

  it('puts a Watch overall on top when the worst alert is Watch', () => {
    const o = by(run(stateWith(7, reading('hip', 0.96)))).bmd_strength_overall
    expect(o).toMatchObject({ status: 'watch', urgency: 50, escalate: false, value: 1, source: 'design value' })
  })
})

describe('engineAlerts: act', () => {
  it('maps BMD at or below the Act limit to Act and escalates', () => {
    const alerts = run(stateWith(7, reading('hip', 0.9)))
    expectContract(alerts)
    const a = by(alerts)
    expect(a.hip_bmd).toMatchObject({ status: 'act', urgency: 100, escalate: true, value: 0.9 })
    expect(a.hip_bmd.why).toMatch(/possible bone loss, not a diagnosis/)
    expect(a.hip_bmd.action).toMatch(/flight surgeon/)
    expect(a.bmd_strength_overall).toMatchObject({ status: 'act', escalate: true, urgency: 100, value: 1 })
    expect(a.bmd_strength_overall.why).toBe(a.hip_bmd.why)
  })

  it('maps strength below 80% of baseline to Act', () => {
    const a = by(run(stateWith(7, reading('deadlift', 70)))).deadlift_strength
    expect(a).toMatchObject({ status: 'act', escalate: true, value: 0.7 })
  })

  it('maps 3 or fewer trained days to Act and escalates', () => {
    // 0 days this week counts once a workout has been logged before (here, the week before).
    const earlier = { '2025-01-06': { strength: true } }
    for (const days of [0, 1, 3]) {
      const state = stateWith(days)
      state.weeklyWorkouts = { ...earlier, ...state.weeklyWorkouts }
      const a = by(run(state)).workouts_this_week
      expect(a).toMatchObject({ status: 'act', urgency: 100, escalate: true, value: days })
      expect(a.why).toMatch(/possible/)
      expect(a.action).toMatch(/flight surgeon/)
    }
  })

  it('uses the latest reading and the latest baseline', () => {
    const newBaseline = { ...baseline, id: 'b2', created: 2, date: '2025-01-05', hip: 0.8 }
    const state = { measurements: [baseline, reading('hip', 0.5), newBaseline, { ...reading('hip', 0.78, 11), date: '2025-01-12' }], weeklyWorkouts: trained(7) }
    expect(by(run(state)).hip_bmd).toMatchObject({ value: 0.975, baseline: 0.8, status: 'watch' })
  })
})

describe('engineAlerts: status and escalate come from the shared cut-offs', () => {
  it('derives status from urgency with 30 and 60, not from the engine bands 20 and 50', () => {
    // Engine urgency is 50 for a Watch-level score. Under the engine's own band (50) it would
    // read Act; with the shared cut-offs (30, 60) it is Watch.
    const a = by(run(stateWith(7, reading('hip', 0.96)))).hip_bmd
    expect(a.urgency).toBe(50)
    expect(a.status).toBe('watch')
    // With stricter cut-offs, the same urgency is Normal.
    const strict = by(run(stateWith(7, reading('hip', 0.96)), SUN, { watch_from: 55, act_from: 90 })).hip_bmd
    expect(strict).toMatchObject({ urgency: 50, status: 'normal', escalate: false })
  })

  it('sets escalate when urgency is at or above act_from', () => {
    const at = by(run(stateWith(7, reading('hip', 0.96)), SUN, { watch_from: 30, act_from: 50 })).hip_bmd
    expect(at).toMatchObject({ status: 'act', escalate: true })
  })

  it('keeps the engine limit edges: exactly 98% is Watch, exactly 95% is Act', () => {
    expect(by(run(stateWith(7, reading('hip', 0.98)))).hip_bmd.status).toBe('watch')
    expect(by(run(stateWith(7, reading('hip', 0.95)))).hip_bmd.status).toBe('act')
  })
})

describe('engineAlerts: empty tracker state raises no alerts', () => {
  it.each([
    ['null', null],
    ['undefined', undefined],
    ['empty object', {}],
    ['nothing saved yet', { measurements: [], workouts: [], unit: 'kg', weeklyWorkouts: {} }],
  ])('returns only Normal, urgency 0 alerts with no ratio for %s', (_name, state) => {
    const alerts = run(state)
    expectContract(alerts)
    for (const a of alerts) {
      expect(a).toMatchObject({ status: 'normal', urgency: 0, escalate: false, baseline: null })
    }
    for (const a of alerts.slice(0, 5)) expect(a.value).toBeNull()
    expect(by(alerts).hip_bmd.why).toMatch(/no hip bmd baseline/i)
    expect(by(alerts).workouts_this_week.why).toMatch(/no training/i)
  })
})

describe('engineAlerts: an unused training log is no data', () => {
  it('keeps workouts_this_week Normal when no workout has ever been logged, even with measurements saved', () => {
    for (const weeklyWorkouts of [undefined, {}, { '2025-01-13': { strength: false, endurance: false } }]) {
      const alerts = run({ measurements: [baseline, reading('hip', 0.99)], weeklyWorkouts })
      const a = by(alerts).workouts_this_week
      expect(a).toMatchObject({ status: 'normal', urgency: 0, escalate: false, value: null, baseline: null })
      expect(a.why).toMatch(/no training has been logged/i)
      expect(by(alerts).bmd_strength_overall.status).toBe('normal')
      for (const x of alerts) expect(validateAlert(x)).toEqual({ ok: true })
    }
  })

  it('scores the week once any day has been ticked', () => {
    const a = by(run({ measurements: [], weeklyWorkouts: { '2025-01-06': { endurance: true } } })).workouts_this_week
    expect(a).toMatchObject({ status: 'act', value: 0 })
  })
})

describe('engineAlerts: baseline missing', () => {
  const noBaseline = { measurements: [reading('hip', 0.5)], weeklyWorkouts: trained(7) }

  it('does not compare a reading without a baseline', () => {
    const a = by(run(noBaseline)).hip_bmd
    expect(a).toMatchObject({ status: 'normal', urgency: 0, escalate: false, value: null, baseline: null })
    expect(a.action).toMatch(/set your baseline/i)
  })

  it('never produces NaN or Infinity', () => {
    const text = JSON.stringify(run(noBaseline))
    expect(text).not.toMatch(/NaN|Infinity/)
  })

  it('still scores the indicators that have a baseline, and the workouts', () => {
    const state = { measurements: [{ ...baseline, hip: null }, reading('hip', 0.5), reading('deadlift', 70, 11)], weeklyWorkouts: trained(2) }
    const a = by(run(state))
    expect(a.hip_bmd.status).toBe('normal')
    expect(a.deadlift_strength).toMatchObject({ status: 'act', value: 0.7 })
    expect(a.workouts_this_week).toMatchObject({ status: 'act', value: 2 })
    expect(a.bmd_strength_overall.status).toBe('act')
  })

  it('scores workouts when only workouts are saved', () => {
    const a = by(run({ measurements: [], weeklyWorkouts: trained(2) }))
    expect(a.workouts_this_week).toMatchObject({ status: 'act', value: 2 })
    expect(a.hip_bmd.status).toBe('normal')
  })

  it('ignores zero, negative and non-numeric baselines', () => {
    const state = { measurements: [{ ...baseline, hip: 0 }, { ...baseline, id: 'x', created: 3, hip: 'abc' }], weeklyWorkouts: trained(7) }
    expect(by(run(state)).hip_bmd).toMatchObject({ value: null, baseline: null, status: 'normal' })
  })
})

describe('workouts count only days up to today (future-day fix)', () => {
  it('counts a day when strength or endurance is ticked, once', () => {
    const state = { weeklyWorkouts: { '2025-01-13': { strength: true, endurance: true }, '2025-01-14': { endurance: true }, '2025-01-15': { strength: false } } }
    expect(workoutsThisWeek(state, WED)).toBe(2)
  })

  it('does not count ticked days after today', () => {
    const state = { weeklyWorkouts: trained(7) }
    expect(workoutsThisWeek(state, WED)).toBe(3)
    expect(workoutsThisWeek(state, '2025-01-13')).toBe(1)
    expect(workoutsThisWeek(state, SUN)).toBe(7)
  })

  it('ignores days from other weeks', () => {
    const state = { weeklyWorkouts: { '2025-01-12': { strength: true }, '2025-01-20': { strength: true }, '2025-01-14': { strength: true } } }
    expect(workoutsThisWeek(state, WED)).toBe(1)
  })

  it('scores the alert with today-limited days: all 7 ticked on Wednesday is 3 days, not 7', () => {
    const a = by(run({ measurements: [baseline], weeklyWorkouts: trained(7) }, WED)).workouts_this_week
    expect(a.value).toBe(3)
    expect(a.status).toBe('act')
  })

  it('handles missing or broken weekly data', () => {
    for (const state of [null, {}, { weeklyWorkouts: null }, { weeklyWorkouts: 'x' }]) expect(workoutsThisWeek(state, WED)).toBe(0)
  })
})

describe('engineAlerts: purity', () => {
  const state = stateWith(7, reading('hip', 0.9))

  it('gives the same result for the same input', () => {
    expect(run(state)).toEqual(run(state))
  })

  it('shares no state between calls: an earlier call does not change a later one', () => {
    const first = run(state)
    // A different tracker, where the first hip reading is 0.5 and the baseline 0.5.
    run({ measurements: [{ ...baseline, hip: 0.5 }, reading('hip', 0.5)], weeklyWorkouts: trained(7) })
    run({ measurements: [{ ...baseline, hip: 2 }, reading('hip', 1)], weeklyWorkouts: trained(0) })
    expect(run(state)).toEqual(first)
    expect(by(first).hip_bmd).toMatchObject({ baseline: 1, status: 'act' })
  })

  it('does not use the first reading as the baseline', () => {
    const a = by(run({ measurements: [{ ...baseline, hip: 1.0 }, reading('hip', 0.9)], weeklyWorkouts: trained(7) })).hip_bmd
    const b = by(run({ measurements: [{ ...baseline, hip: 0.9 }, reading('hip', 0.9)], weeklyWorkouts: trained(7) })).hip_bmd
    expect(a.status).toBe('act')
    expect(b.status).toBe('normal')
  })

  it('does not change its input and returns new objects', () => {
    const frozen = structuredClone(state)
    const deepFreeze = (o) => { Object.values(o).forEach((v) => v && typeof v === 'object' && deepFreeze(v)); return Object.freeze(o) }
    deepFreeze(frozen)
    expect(() => run(frozen)).not.toThrow()
    expect(run(state)[0]).not.toBe(run(state)[0])
  })
})

describe('engineAlerts: every alert passes validateAlert', () => {
  const states = [
    null,
    {},
    stateWith(7),
    stateWith(5, reading('hip', 0.96), reading('lumbar', 1.1), reading('bench', 51)),
    stateWith(0, reading('hip', 0.5), reading('lumbar', 0.5), reading('bench', 5), reading('deadlift', 5)),
    { measurements: [reading('hip', 0.5)], weeklyWorkouts: {} },
  ]
  it.each(states.map((s, i) => [i, s]))('state %i', (_i, state) => {
    for (const today of [WED, SUN]) {
      const alerts = run(state, today)
      expectContract(alerts)
      for (const a of alerts) expect(a.urgency).toBeGreaterThanOrEqual(0)
    }
  })
})

describe('engineAlerts: wording and sources', () => {
  const all = run(stateWith(2, reading('hip', 0.9), reading('lumbar', 1.15), reading('bench', 51), reading('deadlift', 70)))

  it('says "possible" in every Watch and Act text and never diagnoses', () => {
    for (const a of all.filter((x) => x.status !== 'normal')) {
      expect(a.why, a.indicator).toMatch(/possible/)
      expect(`${a.why} ${a.action}`, a.indicator).not.toMatch(/(?<!not a )diagnos|you have|osteoporosis/i)
    }
  })

  it('tells the user to ask the flight surgeon in every Watch and Act text', () => {
    for (const a of all.filter((x) => x.status !== 'normal')) expect(a.action, a.indicator).toMatch(/ask the flight surgeon/i)
  })

  it('cites NASA-STD-3001 Rev C for the two confirmed limits and marks every other number a design value', () => {
    const a = by(all)
    expect(a.hip_bmd.source).toBe(BMD_SOURCE)
    expect(a.lumbar_spine_bmd.source).toBe(BMD_SOURCE)
    expect(BMD_SOURCE).toMatch(/NASA-STD-3001 Vol 1 Rev C/)
    expect(BMD_SOURCE).toMatch(/95%/)
    expect(BMD_SOURCE).toMatch(/98% limit, point weights and urgency cut-offs are design values/)
    expect(a.bench_press_strength.source).toBe(STRENGTH_SOURCE)
    expect(a.deadlift_strength.source).toBe(STRENGTH_SOURCE)
    expect(STRENGTH_SOURCE).toMatch(/NASA-STD-3001 Vol 1 Rev C/)
    expect(STRENGTH_SOURCE).toMatch(/80%/)
    expect(STRENGTH_SOURCE).toMatch(/90% limit, point weights and urgency cut-offs are design values/)
    expect(a.bmd_strength_overall.source).toBe('design value')
  })

  it('replaces the Workouts source text', () => {
    expect(by(all).workouts_this_week.source).toBe('NASA OCHMO-TB-030 (6 to 7 exercise sessions a week); scoring is a design value')
    expect(WORKOUTS_SOURCE).toBe(by(all).workouts_this_week.source)
    for (const a of all) expect(a.source).not.toMatch(/Science In Space|Excercise/)
  })

  it('also sets the source on the no-data alerts', () => {
    const empty = run(null)
    expect(by(empty).hip_bmd.source).toBe(BMD_SOURCE)
    expect(by(empty).workouts_this_week.source).toBe(WORKOUTS_SOURCE)
  })
})

describe('gravity module descriptor with the engine alerts', () => {
  const now = Date.UTC(2025, 0, 19, 12)
  const ctx = (state) => ({ cutoffs, now, bmd: { state, today: SUN } })

  it('keeps every gravity rules.json indicator, adds the engine alerts and returns one gravity_overall', () => {
    const { alerts, errors } = runModules([gravity], {}, ctx(stateWith(7, reading('hip', 0.9))))
    expect(errors).toEqual([])
    const names = alerts.map((a) => a.indicator)
    for (const k of Object.keys(gravityRules.indicators)) expect(names).toContain(k)
    for (const k of INDICATORS.filter((n) => n !== BMD_STRENGTH_OVERALL)) expect(names).toContain(k)
    expect(names.filter((n) => n === 'gravity_overall')).toHaveLength(1)
    expect(names).not.toContain(BMD_STRENGTH_OVERALL)
    expect(names.at(-1)).toBe('gravity_overall')
    expect(alerts.at(-1)).toMatchObject({ status: 'act', escalate: true })
  })

  it('no longer returns the earlier hip, lumbar and missed-training alerts, and has no duplicate indicators', () => {
    const { alerts } = runModules([gravity], {}, ctx(stateWith(7)))
    const names = alerts.map((a) => a.indicator)
    expect(names).not.toContain('strength_training_missed_days')
    expect(names).not.toContain('endurance_training_missed_days')
    expect(new Set(names).size).toBe(names.length)
    for (const n of ['hip_bmd', 'lumbar_spine_bmd', 'bench_press_strength', 'deadlift_strength']) {
      expect(names.filter((x) => x === n)).toHaveLength(1)
    }
  })

  it('combines rules and engine status in gravity_overall', () => {
    const readings = {
      exercise_sessions_per_week: [{ timestamp: now - 86_400_000, domain: 'gravity', indicator: 'exercise_sessions_per_week', value: 5 }],
    }
    const { alerts } = runModules([gravity], { gravity: readings }, ctx(stateWith(7)))
    expect(alerts.find((a) => a.indicator === 'gravity_overall').status).toBe('watch')
    expect(alerts.find((a) => a.indicator === 'hip_bmd').status).toBe('normal')
  })

  it('works without tracker data', () => {
    const { alerts, errors } = runModules([gravity], {}, { cutoffs, now })
    expect(errors).toEqual([])
    expect(alerts.at(-1)).toMatchObject({ indicator: 'gravity_overall', status: 'normal' })
  })
})
