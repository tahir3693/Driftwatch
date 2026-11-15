import { db } from './db.js'
import { scenarioReadings } from '../sim/scenarioReadings.js'
import { validateReading } from '../engine/validateReading.js'

const DAY_MS = 86_400_000

/**
 * Writes the simulated 14-day scenario so that day 14 is just before `now`.
 * Only writes when the store has no readings, and never deletes anything.
 * Resolves with the number of readings written (0 when the store was not empty).
 */
export async function seedScenario(now) {
  if ((await db.readings.count()) > 0) return 0
  const startMs = now - 13 * DAY_MS - 60_000
  const rows = scenarioReadings(startMs).map(({ domain, indicator, timestamp, value }) => ({ domain, indicator, timestamp, value }))
  for (const row of rows) {
    const res = validateReading(row)
    if (!res.ok) throw new Error(`Invalid scenario reading (${res.field}): ${res.message}`)
  }
  await db.readings.bulkAdd(rows)
  return rows.length
}
