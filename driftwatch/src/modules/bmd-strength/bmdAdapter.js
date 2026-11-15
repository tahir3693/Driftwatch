// Adapter for the BMD and strength tracker (public/bmd-strength/, localStorage key
// "orbit-journal-v1"). Pure: it receives the tracker's saved state and today's date and
// returns Alert-contract objects for the gravity domain. It does not read storage or the clock.
//
// Limits, measures and wording come from rules.json. The status logic mirrors the tracker's own
// alarms: red = act, yellow = watch, no alarm = normal.
// - Ratio indicators: act below the act limit (bands.act.value_max); watch from that limit up to
//   and including the watch limit (bands.watch.value_max), as the tracker does; normal above it.
// - Missed training days: act from bands.act.value_min; watch from bands.watch.value_min.
//   Only days of the current week up to today are counted.

import { urgency } from '../../engine/urgency.js'
import defaultRules from './rules.json'

export const BMD_STORAGE_KEY = defaultRules.storage_key
export const BMD_TRACKER_PATH = 'bmd-strength/index.html'

const DOMAIN = defaultRules.domain
const EPSILON = 1e-10 // the tracker's own tolerance at the limits

const RANK = { normal: 0, watch: 1, act: 2 }
const clamp01 = (n) => Math.min(1, Math.max(0, n))
const pct = (r) => `${(r * 100).toFixed(1)}%`
const fill = (template, values) => template.replace(/\{(\w+)\}/g, (m, k) => (k in values ? String(values[k]) : m))

/** Text for one status of a rule: `act` uses the rule's why and action, the rest come from messages. */
function textFor(rule, status, values) {
  const t = status === 'act' ? rule : rule.messages[status]
  return { why: fill(t.why, values), action: fill(t.action, values) }
}

function sortedMeasurements(state) {
  const list = Array.isArray(state?.measurements) ? state.measurements : []
  return [...list]
    .filter((m) => m && typeof m.date === 'string')
    .sort((a, b) => a.date.localeCompare(b.date) || (a.created ?? 0) - (b.created ?? 0))
}

// The tracker counts as in use once anything is saved in it. With nothing saved, missing
// training days are not counted, so an unused tracker raises no alert.
function trackerInUse(state) {
  const measurements = Array.isArray(state?.measurements) ? state.measurements : []
  const weekly = state?.weeklyWorkouts && typeof state.weeklyWorkouts === 'object' ? state.weeklyWorkouts : {}
  return measurements.length > 0 || Object.keys(weekly).length > 0
}

const isNumber = (v) => typeof v === 'number' && Number.isFinite(v) && v > 0

function make(fields, cutoffs, severity = 0) {
  const u = urgency({ status: fields.status }, { severity, cutoffs })
  return {
    domain: DOMAIN,
    indicator: fields.indicator,
    value: fields.value,
    baseline: fields.baseline,
    status: fields.status,
    urgency: u,
    why: fields.why,
    action: fields.action,
    escalate: u >= cutoffs.act_from,
    source: fields.source,
  }
}

function ratioAlert(rule, measure, measurements, cutoffs) {
  const lower = rule.bands.act.value_max
  const upper = rule.bands.watch.value_max
  const withKey = measurements.filter((m) => isNumber(m[measure.key]))
  const base = withKey.filter((m) => m.baseline).at(-1)
  const latest = withKey.at(-1)
  const fields = { indicator: measure.indicator, source: rule.source }
  if (!base || !latest) {
    return make(
      {
        ...fields,
        value: latest ? latest[measure.key] : null,
        baseline: null,
        status: 'normal',
        ...textFor(rule, 'no_data', { label: measure.label }),
      },
      cutoffs,
    )
  }
  const value = latest[measure.key]
  const baseline = base[measure.key]
  const ratio = value / baseline
  const values = { label: measure.label, pct: pct(ratio), date: latest.date, lower: lower * 100, upper: upper * 100 }
  const at = (status) => ({ ...fields, value, baseline, status, ...textFor(rule, status, values) })

  if (ratio < lower - EPSILON) return make(at('act'), cutoffs, clamp01((lower - ratio) / lower))
  if (ratio <= upper + EPSILON) return make(at('watch'), cutoffs, clamp01((upper - ratio) / (upper - lower)))
  return make(at('normal'), cutoffs)
}

/** Monday to Sunday dates (YYYY-MM-DD) of the week that contains `today`. Uses UTC so it is pure. */
export function weekDates(today) {
  const [y, m, d] = today.split('-').map(Number)
  const t = Date.UTC(y, m - 1, d)
  const weekday = (new Date(t).getUTCDay() + 6) % 7
  return Array.from({ length: 7 }, (_, i) => new Date(t + (i - weekday) * 86_400_000).toISOString().slice(0, 10))
}

/** Unchecked days of one training type in the current week, counting only days up to today. */
export function missedTrainingDays(state, type, today) {
  const weekly = state?.weeklyWorkouts ?? {}
  return weekDates(today).filter((date) => date <= today && !weekly[date]?.[type]).length
}

function missedDaysAlert(rule, measure, state, today, cutoffs, weekDays) {
  const type = measure.key
  const fields = { indicator: measure.indicator, baseline: null, source: rule.source }
  if (!trackerInUse(state)) {
    return make({ ...fields, value: null, status: 'normal', ...textFor(rule, 'no_data', { type }) }, cutoffs)
  }
  const watchFrom = rule.bands.watch.value_min
  const actFrom = rule.bands.act.value_min
  const missed = missedTrainingDays(state, type, today)
  const values = { missed, type, plural: missed === 1 ? '' : 's' }
  const at = (status) => ({ ...fields, value: missed, status, ...textFor(rule, status, values) })

  if (missed >= actFrom) return make(at('act'), cutoffs, clamp01((missed - actFrom) / (weekDays - actFrom)))
  if (missed >= watchFrom) {
    return make(at('watch'), cutoffs, clamp01((missed - watchFrom) / Math.max(1, actFrom - 1 - watchFrom)))
  }
  return make(at('normal'), cutoffs)
}

/** Overall alert for a list of gravity alerts: highest status, maximum urgency, text of the top alert. */
export function gravityOverall(alerts, cutoffs) {
  const list = alerts.filter((a) => a.indicator !== `${DOMAIN}_overall`)
  let top = null
  for (const a of list) if (!top || a.urgency > top.urgency) top = a
  const status = list.reduce((s, a) => (RANK[a.status] > RANK[s] ? a.status : s), 'normal')
  const maxUrgency = list.reduce((m, a) => Math.max(m, a.urgency), 0)
  return {
    domain: DOMAIN,
    indicator: `${DOMAIN}_overall`,
    value: list.filter((a) => a.status !== 'normal').length,
    baseline: null,
    status,
    urgency: maxUrgency,
    why: top ? top.why : 'No gravity indicators to report.',
    action: top ? top.action : 'No action needed.',
    escalate: maxUrgency >= cutoffs.act_from,
    source: 'design value',
  }
}

/**
 * Map the tracker's saved state to gravity alerts.
 * state: the parsed value of localStorage "orbit-journal-v1" (or null when nothing is saved).
 * options: { today: 'YYYY-MM-DD', cutoffs: { watch_from, act_from }, rules? } (rules defaults to rules.json).
 * Returns one alert per measure, in rules.json order, plus gravity_overall.
 */
export function bmdAlerts(state, { today, cutoffs, rules = defaultRules }) {
  const measurements = sortedMeasurements(state)
  const weekDays = rules.week_days ?? 7
  const alerts = []
  for (const rule of Object.values(rules.indicators)) {
    for (const measure of rule.measures) {
      alerts.push(
        rule.kind === 'missed_days'
          ? missedDaysAlert(rule, measure, state, today, cutoffs, weekDays)
          : ratioAlert(rule, measure, measurements, cutoffs),
      )
    }
  }
  return [...alerts, gravityOverall(alerts, cutoffs)]
}
