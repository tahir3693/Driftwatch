// Helpers for the BMD and strength tracker (public/bmd-strength/, localStorage key
// "orbit-journal-v1"). Pure: they receive the tracker's saved state and today's date and do
// not read storage or the clock.
//
// The alerts themselves are built in engineAdapter.js from the teammate's scoring engine.
// This file keeps what both the alerts and the rest of the app share: the storage key and
// tracker path, the week helpers, the "tracker in use" check and the gravity overall alert.
import defaultRules from './rules.json'

export const BMD_STORAGE_KEY = defaultRules.storage_key
export const BMD_TRACKER_PATH = 'bmd-strength/index.html'

const DOMAIN = defaultRules.domain
const RANK = { normal: 0, watch: 1, act: 2 }

/** Saved measurements, oldest first (same date: by creation time). Ignores broken entries. */
export function sortedMeasurements(state) {
  const list = Array.isArray(state?.measurements) ? state.measurements : []
  return [...list]
    .filter((m) => m && typeof m.date === 'string')
    .sort((a, b) => a.date.localeCompare(b.date) || (a.created ?? 0) - (b.created ?? 0))
}

/**
 * The tracker counts as in use once anything is saved in it. With nothing saved, nothing is
 * scored, so an unused tracker raises no alert.
 */
export function trackerInUse(state) {
  const measurements = Array.isArray(state?.measurements) ? state.measurements : []
  const weekly = state?.weeklyWorkouts && typeof state.weeklyWorkouts === 'object' ? state.weeklyWorkouts : {}
  return measurements.length > 0 || Object.keys(weekly).length > 0
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
