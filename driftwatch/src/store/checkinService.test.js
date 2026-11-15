import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { db } from './db.js'
import { getReadings } from './readings.js'
import { submitCheckIn } from './checkinService.js'
import { dayBounds } from '../engine/dayKey.js'

const DAY = '2025-03-10'
const NOW = dayBounds(DAY).start + 12 * 3_600_000
const nutrition = { intake: '85' }
const env = { co2: '1.5', headache: true, nauseaFatigue: false, temperature: '36.7' }

beforeEach(async () => {
  await db.readings.clear()
  await db.checkins.clear()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => vi.restoreAllMocks())

describe('submitCheckIn', () => {
  it('saves nothing for invalid input and returns the errors', async () => {
    const refresh = vi.fn()
    const res = await submitCheckIn({ module: 'nutrition', raw: { intake: 'abc' }, now: NOW, refresh })
    expect(res).toEqual({ status: 'invalid', errors: [{ field: 'intake', message: 'Food intake must be a number.' }] })
    expect(await db.readings.count()).toBe(0)
    expect(await db.checkins.count()).toBe(0)
    expect(refresh).not.toHaveBeenCalled()
  })

  it('saves, calls refresh once with now after the save, and reports the streak going up', async () => {
    const seen = []
    const refresh = vi.fn(async (t) => {
      seen.push([t, await db.readings.count(), await db.checkins.count()])
    })
    const res = await submitCheckIn({ module: 'nutrition', raw: nutrition, now: NOW, refresh })
    expect(res).toEqual({ status: 'saved', streakBefore: 0, streakAfter: 1 })
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(seen).toEqual([[NOW, 1, 1]])
    expect(await getReadings({ domain: 'nutrition', indicator: 'intake_pct_of_plan' })).toEqual([
      { domain: 'nutrition', indicator: 'intake_pct_of_plan', timestamp: NOW, value: 85 },
    ])
  })

  it('keeps the streak the same on a second submit on the same day', async () => {
    const refresh = vi.fn()
    await submitCheckIn({ module: 'nutrition', raw: nutrition, now: NOW, refresh })
    const res = await submitCheckIn({ module: 'nutrition', raw: { intake: '90' }, now: NOW + 1000, refresh })
    expect(res.streakBefore).toBe(1)
    expect(res.streakAfter).toBe(1)
    expect(await db.checkins.count()).toBe(1)
    expect((await db.readings.toArray()).map((r) => r.value)).toEqual([90])
  })

  it('returns save_failed and writes no record when the save throws', async () => {
    vi.spyOn(db.checkins, 'put').mockRejectedValue(new Error('quota'))
    const refresh = vi.fn()
    const res = await submitCheckIn({ module: 'nutrition', raw: nutrition, now: NOW, refresh })
    expect(res).toEqual({ status: 'save_failed' })
    expect(await db.readings.count()).toBe(0)
    expect(await db.checkins.count()).toBe(0)
    expect(refresh).not.toHaveBeenCalled()
  })

  it('returns save_failed and writes nothing when the headache history cannot be read', async () => {
    vi.spyOn(db.readings, 'where').mockImplementation(() => {
      throw new Error('unreadable')
    })
    const res = await submitCheckIn({ module: 'environment', raw: env, now: NOW, refresh: vi.fn() })
    expect(res.status).toBe('save_failed')
    vi.restoreAllMocks()
    expect(await db.readings.count()).toBe(0)
    expect(await db.checkins.count()).toBe(0)
  })

  it('returns saved_rerun_failed and keeps the data when refresh rejects', async () => {
    const refresh = vi.fn().mockRejectedValue(new Error('engine'))
    const res = await submitCheckIn({ module: 'nutrition', raw: nutrition, now: NOW, refresh })
    expect(res).toEqual({ status: 'saved_rerun_failed', streakBefore: 0, streakAfter: 1 })
    expect(await db.readings.count()).toBe(1)
    expect(await db.checkins.count()).toBe(1)
  })

  it('derives the symptom code from the stored headache history', async () => {
    const refresh = vi.fn()
    const day = (k) => dayBounds(`2025-03-0${k}`).start + 10 * 3_600_000
    await submitCheckIn({ module: 'environment', raw: env, now: day(8), refresh })
    await submitCheckIn({ module: 'environment', raw: env, now: day(9), refresh })
    await submitCheckIn({ module: 'environment', raw: env, now: NOW, refresh })
    const codes = (await getReadings({ domain: 'environment', indicator: 'symptom_check' })).map((r) => r.value)
    expect(codes).toEqual([0, 1, 2])
  })

  it('still saves with fetch stubbed to throw', async () => {
    vi.stubGlobal('fetch', () => {
      throw new Error('no network')
    })
    const res = await submitCheckIn({ module: 'gravity', raw: { exercise: '5' }, now: NOW, refresh: vi.fn() })
    vi.unstubAllGlobals()
    expect(res.status).toBe('saved')
  })
})