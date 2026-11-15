// Dexie access for check-ins: save with replace-on-resubmit, list days, headache history.
import { db } from './db.js'
import { getReadings } from './readings.js'
import { validateReading } from '../engine/validateReading.js'
import { dayBounds, shiftDayKey } from '../engine/dayKey.js'

/**
 * One transaction on readings and checkins:
 * delete the Readings of the earlier submit of this module on this day, add the new ones, put the record.
 * Any thrown error rolls everything back. Resolves with { readingIds }.
 */
export async function saveCheckIn({ module, dayKey, now, readings }) {
  return db.transaction('rw', db.readings, db.checkins, async () => {
    const existing = await db.checkins.where('[dayKey+module]').equals([dayKey, module]).first()
    if (existing && existing.readingIds.length > 0) await db.readings.bulkDelete(existing.readingIds)
    const rows = readings.map((r) => {
      const check = validateReading(r)
      if (!check.ok) throw new Error(`Invalid reading: ${check.message}`)
      const { domain, indicator, timestamp, value } = r
      return { domain, indicator, timestamp, value }
    })
    const readingIds = await db.readings.bulkAdd(rows, { allKeys: true })
    await db.checkins.put({
      ...(existing ? { id: existing.id } : {}),
      dayKey,
      module,
      submittedAt: now,
      readingIds,
    })
    return { readingIds }
  })
}

/** All check-in records as [{ dayKey, module }], for computeStreak. */
export async function getCheckInDays() {
  const rows = await db.checkins.toArray()
  return rows.map(({ dayKey, module }) => ({ dayKey, module }))
}

/** [headache on dayKey-1, headache on dayKey-2] from environment/headache_logged Readings. Today is excluded. */
export async function getHeadacheHistory(dayKey) {
  const yesterday = dayBounds(shiftDayKey(dayKey, -1))
  const dayBefore = dayBounds(shiftDayKey(dayKey, -2))
  const todayStart = dayBounds(dayKey).start
  const list = (await getReadings({ domain: 'environment', indicator: 'headache_logged' })).filter((r) => r.timestamp < todayStart)
  const had = (b) => list.some((r) => r.timestamp >= b.start && r.timestamp < b.end && r.value === 1)
  return [had(yesterday), had(dayBefore)]
}