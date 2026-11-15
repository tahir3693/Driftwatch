import { mean, stdDev } from './stats.js'

const DAY_MS = 86_400_000

/**
 * Personal baseline from readings inside [now - windowDays days, now].
 * `now` defaults to the latest reading timestamp (no clock is read).
 * Returns { ready: true, mean, sd, n } or { ready: false, n }.
 */
export function computeBaseline(readings, windowDays, options = {}) {
  const { minReadings = 5 } = options
  let now = options.now
  if (now === undefined) {
    now = -Infinity
    for (const r of readings) if (r.timestamp > now) now = r.timestamp
  }
  const from = now - windowDays * DAY_MS
  const inWindow = readings
    .filter((r) => r.timestamp >= from && r.timestamp <= now)
    .sort((a, b) => a.timestamp - b.timestamp)
  const values = inWindow.map((r) => r.value)
  const n = values.length
  if (n < minReadings) return { ready: false, n }
  return { ready: true, mean: mean(values), sd: stdDev(values), n }
}
