import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from './db.js'
import { seedScenario } from './seedScenario.js'
import { saveReading, getReadings } from './readings.js'

const NOW = 1_800_000_000_000
const DAY = 86_400_000

beforeEach(async () => {
  await db.readings.clear()
})

describe('seedScenario', () => {
  it('writes the scenario so that day 14 is just before now', async () => {
    const n = await seedScenario(NOW)
    expect(n).toBeGreaterThan(0)
    expect(await db.readings.count()).toBe(n)
    const sleep = await getReadings({ domain: 'environment', indicator: 'sleep_hours' })
    expect(sleep).toHaveLength(14)
    expect(sleep.at(-1).timestamp).toBe(NOW - 60_000)
    expect(sleep[0].timestamp).toBe(NOW - 60_000 - 13 * DAY)
    const flux = await getReadings({ domain: 'radiation', indicator: 'proton_flux_pfu' })
    expect(flux).toHaveLength(14)
  })

  it('does nothing and deletes nothing when readings already exist', async () => {
    await saveReading({ domain: 'nutrition', indicator: 'intake_pct_of_plan', timestamp: NOW - 1000, value: 90 })
    expect(await seedScenario(NOW)).toBe(0)
    expect(await db.readings.count()).toBe(1)
  })
})
