// Adapter from the teammate's BMD and strength scoring engine (teammate-engine/) to the
// Driftwatch alert contract. Pure: it receives the tracker's saved state (loadBmdState in
// store/bmdState.js) and today's date, and does not read storage or the clock.
//
// For Hip, Spine, Benchpress and Deadlift it calls the engine's evaluate with the latest reading,
// the baseline from the tracker and the workouts completed this week (days up to today only).
// The engine scores each indicator on 0 to 100. This file keeps that urgency, but derives the
// status and escalate flag from the shared cut-offs (cutoffs.json), not from the engine's own
// bands, and writes the wording ("possible", ask the flight surgeon).
import { evaluate, RULES } from './teammate-engine/BMD_and_strength_engine.js'
import { statusFromUrgency } from '../../engine/urgency.js'
import { sortedMeasurements, trackerInUse, weekDates } from './bmdAdapter.js'
import rules from './rules.json'

const DOMAIN = rules.domain // 'gravity'
export const BMD_STRENGTH_OVERALL = 'bmd_strength_overall'

// Sources. The 95% BMD limit (V1 4027) and the 80% strength limit (V1 4024) are in NASA-STD-3001
// Vol 1 Rev C, checked against the published standard. Every other number is a design value.
export const BMD_SOURCE =
  'NASA-STD-3001 Vol 1 Rev C (V1 4027: hip and spine BMD at or above 95% of pre-mission values); the 98% limit, point weights and urgency cut-offs are design values'
export const STRENGTH_SOURCE =
  'NASA-STD-3001 Vol 1 Rev C (V1 4024: strength at or above 80% of baseline); the 90% limit, point weights and urgency cut-offs are design values'
export const WORKOUTS_SOURCE = 'NASA OCHMO-TB-030 (6 to 7 exercise sessions a week); scoring is a design value'

// Order is the order of the alerts. `engine` is the name the engine knows the indicator by;
// `key` is the field in the tracker's measurements.
export const PARAMETERS = [
  { engine: 'Hip', key: 'hip', indicator: 'hip_bmd', label: 'Hip BMD', bone: true },
  { engine: 'Spine', key: 'lumbar', indicator: 'lumbar_spine_bmd', label: 'Lumbar spine BMD', bone: true },
  { engine: 'Benchpress', key: 'bench', indicator: 'bench_press_strength', label: 'Bench press', bone: false },
  { engine: 'Deadlift', key: 'deadlift', indicator: 'deadlift_strength', label: 'Deadlift', bone: false },
]
export const WORKOUTS_INDICATOR = 'workouts_this_week'

const RANK = { normal: 0, watch: 1, act: 2 }
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n))
const isNumber = (v) => typeof v === 'number' && Number.isFinite(v) && v > 0
const percent = (ratio) => `${(ratio * 100).toFixed(1)}%`
const wholePercent = (ratio) => `${Math.round(ratio * 100)}%`

/**
 * Training days completed this week, counting only days up to today. A day counts once when
 * strength or endurance training (or both) is ticked, so the result is 0 to 7.
 */
export function workoutsThisWeek(state, today) {
  const weekly = state?.weeklyWorkouts && typeof state.weeklyWorkouts === 'object' ? state.weeklyWorkouts : {}
  return weekDates(today).filter((date) => date <= today && (weekly[date]?.strength || weekly[date]?.endurance)).length
}

function build(fields, cutoffs) {
  const u = Math.round(clamp(Number.isFinite(fields.urgency) ? fields.urgency : 0, 0, 100))
  return {
    domain: DOMAIN,
    indicator: fields.indicator,
    value: fields.value,
    baseline: fields.baseline,
    status: statusFromUrgency(u, cutoffs),
    urgency: u,
    why: fields.why,
    action: fields.action,
    escalate: u >= cutoffs.act_from,
    source: fields.source,
  }
}

function parameterText(p, status, ratio) {
  const [watchRatio, actRatio] = RULES[p.engine]
  const effect = p.bone ? 'bone loss' : 'loss of muscle strength'
  const at = `${p.label} is ${percent(ratio)} of your baseline`
  if (status === 'act') {
    return {
      why: `${at}, at or below the ${wholePercent(actRatio)} limit. This is a possible ${effect}, not a diagnosis.`,
      action: 'Ask the flight surgeon now and follow their advice. Do not change your exercise or diet plan on your own.',
    }
  }
  if (status === 'watch') {
    return {
      why: `${at}, at or below the ${wholePercent(watchRatio)} limit. This is an early sign of possible ${effect}.`,
      action: 'Ask the flight surgeon about this result at the next contact. Re-measure as scheduled and keep to the planned exercise.',
    }
  }
  return {
    why: `${at}, above the ${wholePercent(watchRatio)} limit.`,
    action: 'No action needed. Keep to the planned exercise.',
  }
}

function noDataParameter(p, cutoffs) {
  return build(
    {
      indicator: p.indicator,
      value: null,
      baseline: null,
      urgency: 0,
      why: `No ${p.label} baseline is set in the BMD and strength tracker yet, so no comparison is made.`,
      action: 'Set your baseline in the BMD and strength tracker. Ask the flight surgeon if you are unsure which values to use.',
      source: p.bone ? BMD_SOURCE : STRENGTH_SOURCE,
    },
    cutoffs,
  )
}

function parameterAlert(p, raw, ratio, cutoffs) {
  const status = statusFromUrgency(raw.urgency, cutoffs)
  return build(
    {
      indicator: p.indicator,
      value: Math.round(ratio * 1000) / 1000,
      baseline: raw.baseline,
      urgency: raw.urgency,
      ...parameterText(p, status, ratio),
      source: p.bone ? BMD_SOURCE : STRENGTH_SOURCE,
    },
    cutoffs,
  )
}

function workoutsAlert(raw, count, cutoffs) {
  const status = statusFromUrgency(raw.urgency, cutoffs)
  const days = `${count} training day${count === 1 ? '' : 's'} logged this week, up to today`
  const text =
    status === 'normal'
      ? { why: `${days}.`, action: 'No action needed. Keep logging your workouts.' }
      : {
          why: `${days}, below the 6 to 7 sessions a week that worked in spaceflight. Missed training is a possible risk to bone and muscle.`,
          action:
            status === 'act'
              ? 'Ask the flight surgeon about the training plan. Do not try to make up all missed sessions at once.'
              : 'Plan the next sessions this week and ask the flight surgeon if it continues.',
        }
  return build(
    { indicator: WORKOUTS_INDICATOR, value: count, baseline: null, urgency: raw.urgency, ...text, source: WORKOUTS_SOURCE },
    cutoffs,
  )
}

function noDataWorkouts(cutoffs) {
  return build(
    {
      indicator: WORKOUTS_INDICATOR,
      value: null,
      baseline: null,
      urgency: 0,
      why: 'No training has been logged in the BMD and strength tracker yet.',
      action: 'Log completed training in the BMD and strength tracker. Ask the flight surgeon if you are unsure about the plan.',
      source: WORKOUTS_SOURCE,
    },
    cutoffs,
  )
}

/** Overall alert for the tracker: highest status, maximum urgency, text of the most urgent alert. */
function overall(alerts, cutoffs) {
  let top = null
  for (const a of alerts) if (!top || a.urgency > top.urgency) top = a
  const status = alerts.reduce((s, a) => (RANK[a.status] > RANK[s] ? a.status : s), 'normal')
  const maxUrgency = alerts.reduce((m, a) => Math.max(m, a.urgency), 0)
  return {
    domain: DOMAIN,
    indicator: BMD_STRENGTH_OVERALL,
    value: alerts.filter((a) => a.status !== 'normal').length,
    baseline: null,
    status,
    urgency: maxUrgency,
    why: top ? top.why : 'No BMD and strength indicators to report.',
    action: top ? top.action : 'No action needed.',
    escalate: maxUrgency >= cutoffs.act_from,
    source: 'design value',
  }
}

/**
 * Map the tracker's saved state to gravity alerts using the teammate's engine.
 * state: the parsed value of localStorage "orbit-journal-v1" (or null when nothing is saved).
 * options: { today: 'YYYY-MM-DD', cutoffs: { watch_from, act_from } }.
 * Returns hip_bmd, lumbar_spine_bmd, bench_press_strength, deadlift_strength, workouts_this_week
 * and bmd_strength_overall. An indicator with no baseline or no reading is Normal with urgency 0
 * and no ratio (value null), and an unused tracker raises nothing.
 */
export function engineAlerts(state, { today, cutoffs }) {
  const measurements = sortedMeasurements(state)
  const count = workoutsThisWeek(state, today)
  const results = []
  let workoutsRaw = null
  for (const p of PARAMETERS) {
    const withKey = measurements.filter((m) => isNumber(m[p.key]))
    const base = withKey.filter((m) => m.baseline).at(-1)
    const latest = withKey.at(-1)
    if (!base || !latest) {
      results.push(noDataParameter(p, cutoffs))
      continue
    }
    const [scored, ...rest] = evaluate({
      registered_week_workouts: count,
      registered_value: latest[p.key],
      baseline_value: base[p.key],
      baseline_indicator: p.engine,
    })
    workoutsRaw ??= scored
    results.push(parameterAlert(p, rest[0], latest[p.key] / base[p.key], cutoffs))
  }
  let workouts
  if (!trackerInUse(state)) {
    workouts = noDataWorkouts(cutoffs)
  } else {
    // The Workouts score does not depend on the baseline, so any evaluate call gives it. With no
    // parameter evaluated, a neutral call (reading equal to baseline) is used just to read it.
    workoutsRaw ??= evaluate({
      registered_week_workouts: count,
      registered_value: 1,
      baseline_value: 1,
      baseline_indicator: PARAMETERS[0].engine,
    })[0]
    workouts = workoutsAlert(workoutsRaw, count, cutoffs)
  }
  const alerts = [...results, workouts]
  return [...alerts, overall(alerts, cutoffs)]
}
