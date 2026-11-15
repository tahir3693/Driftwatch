import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { db } from './db.js'
import { saveReading, getReadings } from './readings.js'
import { saveCheckIn, getCheckInDays, getHeadacheHistory } from './checkins.js'
import { dayBounds } from '../engine/dayKey.js'

const NOON = (key) => (dayBounds(key).start + dayBounds(key).end) / 2
const r = (indicator, value, timestamp, domain = 'nutrition') => ({ domain, indicator, timestamp, value })

beforeEach(async () => {
  await db.readings.clear()
  await db.checkins.clear()
})
afterEach(() => vi.restoreAllMocks())

describe('saveCheckIn', () => {
  it('saves Readings and a record, and reads them back', async () => {
    const now = NOON('2025-03-10')
    const readings = [r('intake_pct_of_plan', 88, now)]
    const { readingIds } = await saveCheckIn({ module: 'nutrition', dayKey: '2025-03-10', now, readings })
    expect(readingIds).toHaveLength(1)
    expect(await getReadings({ domain: 'nutrition', indicator: 'intake_pct_of_plan' })).toEqual(readings)
    expect(await getCheckInDays()).toEqual([{ dayKey: '2025-03-10', module: 'nutrition' }])
    const rec = await db.checkins.toCollection().first()
    expect(rec.submittedAt).toBe(now)
    expect(rec.readingIds).toEqual(readingIds)
  })

  it('leaves one set of Readings and one record after a second save of one module on one day', async () => {
    const day = '2025-03-10'
    const t1 = NOON(day)
    const t2 = t1 + 3_600_000
    await saveCheckIn({ module: 'nutrition', dayKey: day, now: t1, readings: [r('intake_pct_of_plan', 50, t1)] })
    await saveCheckIn({ module: 'nutrition', dayKey: day, now: t2, readings: [r('intake_pct_of_plan', 95, t2)] })
    const rows = await getReadings({ domain: 'nutrition', indicator: 'intake_pct_of_plan' })
    expect(rows).toEqual([r('intake_pct_of_plan', 95, t2)])
    expect(await db.checkins.count()).toBe(1)
    expect((await db.checkins.toCollection().first()).submittedAt).toBe(t2)
  })

  it('does not touch Readings of other modules, other days or Readings written by other means', async () => {
    const day = '2025-03-10'
    const t = NOON(day)
    await saveReading(r('intake_pct_of_plan', 77, t - 1000)) // same day, written by the scenario
    await saveCheckIn({ module: 'gravity', dayKey: day, now: t, readings: [r('exercise_sessions_per_week', 4, t, 'gravity')] })
    await saveCheckIn({ module: 'nutrition', dayKey: '2025-03-09', now: t - 86_400_000, readings: [r('intake_pct_of_plan', 60, t - 86_400_000)] })
    await saveCheckIn({ module: 'nutrition', dayKey: day, now: t, readings: [r('intake_pct_of_plan', 99, t)] })
    await saveCheckIn({ module: 'nutrition', dayKey: day, now: t + 1, readings: [r('intake_pct_of_plan', 98, t + 1)] })
    const intake = (await getReadings({ domain: 'nutrition', indicator: 'intake_pct_of_plan' })).map((x) => x.value)
    expect(intake).toEqual([60, 77, 98])
    expect(await getReadings({ domain: 'gravity', indicator: 'exercise_sessions_per_week' })).toHaveLength(1)
    expect(await db.checkins.count()).toBe(3)
  })

  it('rolls back when the record put fails, keeping an earlier record and its Readings', async () => {
    const day = '2025-03-10'
    const t = NOON(day)
    await saveCheckIn({ module: 'nutrition', dayKey: day, now: t, readings: [r('intake_pct_of_plan', 80, t)] })
    vi.spyOn(db.checkins, 'put').mockRejectedValue(new Error('disk full'))
    await expect(saveCheckIn({ module: 'nutrition', dayKey: day, now: t + 5, readings: [r('intake_pct_of_plan', 20, t + 5)] })).rejects.toThrow('disk full')
    vi.restoreAllMocks()
    expect((await getReadings({ domain: 'nutrition', indicator: 'intake_pct_of_plan' })).map((x) => x.value)).toEqual([80])
    expect(await db.checkins.count()).toBe(1)
    expect((await db.checkins.toCollection().first()).submittedAt).toBe(t)
  })

  it('writes nothing for a first save that fails', async () => {
    vi.spyOn(db.checkins, 'put').mockRejectedValue(new Error('boom'))
    await expect(saveCheckIn({ module: 'nutrition', dayKey: '2025-03-10', now: 5, readings: [r('intake_pct_of_plan', 20, 5)] })).rejects.toThrow()
    vi.restoreAllMocks()
    expect(await db.readings.count()).toBe(0)
    expect(await db.checkins.count()).toBe(0)
  })

  it('rejects an invalid Reading and writes nothing', async () => {
    const bad = { domain: 'nutrition', indicator: 'intake_pct_of_plan', timestamp: 5, value: NaN }
    await expect(saveCheckIn({ module: 'nutrition', dayKey: '2025-03-10', now: 5, readings: [r('intake_pct_of_plan', 1, 5), bad] })).rejects.toThrow()
    expect(await db.readings.count()).toBe(0)
    expect(await db.checkins.count()).toBe(0)
  })
})

describe('getHeadacheHistory', () => {
  const headache = (key, hours, value) => saveReading(r('headache_logged', value, dayBounds(key).start + hours * 3_600_000, 'environment'))

  it('returns flags for the two previous local days across a local midnight', async () => {
    await headache('2025-03-09', 23.9, 1) // just before the midnight that starts 2025-03-10
    await headache('2025-03-08', 0.1, 1) // just after the midnight that starts 2025-03-08
    await headache('2025-03-10', 1, 1) // today: excluded
    expect(await getHeadacheHistory('2025-03-10')).toEqual([true, true])
    expect(await getHeadacheHistory('2025-03-11')).toEqual([true, true])
    expect(await getHeadacheHistory('2025-03-12')).toEqual([false, true])
    expect(await getHeadacheHistory('2025-03-13')).toEqual([false, false])
  })

  it('ignores days with value 0 and returns false, false with no history', async () => {
    await headache('2025-03-09', 8, 0)
    expect(await getHeadacheHistory('2025-03-10')).toEqual([false, false])
  })
})

describe('restart', () => {
  it('keeps records after closing and reopening the database', async () => {
    await saveCheckIn({ module: 'gravity', dayKey: '2025-03-10', now: NOON('2025-03-10'), readings: [r('exercise_sessions_per_week', 3, NOON('2025-03-10'), 'gravity')] })
    db.close()
    await db.open()
    expect(await getCheckInDays()).toEqual([{ dayKey: '2025-03-10', module: 'gravity' }])
    expect(await db.readings.count()).toBe(1)
  })
})