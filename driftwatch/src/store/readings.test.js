import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './db.js'
import { saveReading, getReadings, ReadingValidationError } from './readings.js'

const DAY = 86_400_000
const NOW = 1_700_000_000_000
const r = (timestamp, value = 1, extra = {}) => ({
  domain: 'radiation',
  indicator: 'dose',
  timestamp,
  value,
  ...extra,
})

beforeEach(async () => {
  await db.readings.clear()
})

describe('readings store', () => {
  it('saves a reading and reads it back without id', async () => {
    const id = await saveReading(r(NOW, 4.2))
    expect(typeof id).toBe('number')
    const out = await getReadings({ domain: 'radiation', indicator: 'dose' })
    expect(out).toEqual([r(NOW, 4.2)])
    expect(out[0]).not.toHaveProperty('id')
  })

  it('returns readings oldest first when saved out of order', async () => {
    await saveReading(r(NOW - 1 * DAY, 2))
    await saveReading(r(NOW - 3 * DAY, 3))
    await saveReading(r(NOW - 2 * DAY, 1))
    const out = await getReadings({ domain: 'radiation', indicator: 'dose' })
    expect(out.map((x) => x.timestamp)).toEqual([NOW - 3 * DAY, NOW - 2 * DAY, NOW - 1 * DAY])
  })

  it('filters by domain and indicator', async () => {
    await saveReading(r(NOW))
    await saveReading(r(NOW, 1, { indicator: 'other' }))
    await saveReading(r(NOW, 1, { domain: 'gravity' }))
    const out = await getReadings({ domain: 'radiation', indicator: 'dose' })
    expect(out).toHaveLength(1)
  })

  it('includes the window lower bound and excludes older readings', async () => {
    const lower = NOW - 7 * DAY
    await saveReading(r(lower - 1, 1))
    await saveReading(r(lower, 2))
    await saveReading(r(NOW, 3))
    const out = await getReadings({
      domain: 'radiation',
      indicator: 'dose',
      windowDays: 7,
      now: NOW,
    })
    expect(out.map((x) => x.value)).toEqual([2, 3])
  })

  it('rejects an invalid domain and leaves the store unchanged', async () => {
    await saveReading(r(NOW))
    await expect(saveReading(r(NOW, 1, { domain: 'bogus' }))).rejects.toMatchObject({
      name: 'ReadingValidationError',
      field: 'domain',
    })
    await expect(saveReading(r(NOW, 1, { domain: 'bogus' }))).rejects.toBeInstanceOf(
      ReadingValidationError,
    )
    expect(await db.readings.count()).toBe(1)
  })

  it('rejects a missing field naming it and leaves the store unchanged', async () => {
    const { indicator, ...missing } = r(NOW) // eslint-disable-line no-unused-vars
    await expect(saveReading(missing)).rejects.toMatchObject({ field: 'indicator' })
    const { timestamp, ...noTs } = r(NOW) // eslint-disable-line no-unused-vars
    await expect(saveReading(noTs)).rejects.toMatchObject({ field: 'timestamp' })
    expect(await db.readings.count()).toBe(0)
  })
})
