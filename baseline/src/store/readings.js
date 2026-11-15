import Dexie from 'dexie'
import { db } from './db.js'
import { validateReading } from '../engine/validateReading.js'

const DAY_MS = 86_400_000

export class ReadingValidationError extends Error {
  constructor(field, message) {
    super(message)
    this.name = 'ReadingValidationError'
    this.field = field
    this.message = message
  }
}

// Validates, then writes. Resolves with the new auto-increment id.
export async function saveReading(reading) {
  const result = validateReading(reading)
  if (!result.ok) {
    throw new ReadingValidationError(result.field, result.message)
  }
  const { domain, indicator, timestamp, value } = reading
  return db.readings.add({ domain, indicator, timestamp, value })
}

// Readings for one domain and indicator, oldest first, without `id`.
// With windowDays, returns timestamps in [now - windowDays days, now].
// This function never reads the clock, so `now` is required with `windowDays`.
export async function getReadings({ domain, indicator, windowDays, now } = {}) {
  let lower = Dexie.minKey
  let upper = Dexie.maxKey
  if (windowDays !== undefined && windowDays !== null) {
    if (typeof now !== 'number' || !Number.isFinite(now)) {
      throw new TypeError('getReadings: now is required when windowDays is given')
    }
    lower = now - windowDays * DAY_MS
    upper = now
  }
  const rows = await db.readings
    .where('[domain+indicator+timestamp]')
    .between([domain, indicator, lower], [domain, indicator, upper], true, true)
    .toArray()
  return rows.map(({ id, ...reading }) => reading) // eslint-disable-line no-unused-vars
}
