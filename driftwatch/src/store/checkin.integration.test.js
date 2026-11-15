// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { db } from './db.js'
import { getReadings } from './readings.js'
import { getCheckInDays } from './checkins.js'
import { submitCheckIn } from './checkinService.js'
import { buildDashboardData } from './dashboardData.js'
import { computeStreak } from '../engine/streak.js'
import { dayBounds, shiftDayKey } from '../engine/dayKey.js'
import { loadCheckinConfig } from '../data/checkinData.js'
import environmentRules from '../modules/environment/rules.json'

const TODAY = '2025-03-10'
const at = (key) => dayBounds(key).start + 12 * 3_600_000
const NOW = at(TODAY)
const actEdge = environmentRules.indicators.cabin_co2_mmHg.bands.act.value_min
const env = (co2) => ({ co2: String(co2), headache: false, nauseaFatigue: false, temperature: '36.6' })
const overall = (data, domain) => data.alerts.find((a) => a.indicator === `${domain}_overall`)

beforeEach(async () => {
  localStorage.clear()
  await db.readings.clear()
  await db.checkins.clear()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => vi.restoreAllMocks())

// 7 earlier days of Environment check-ins, each with a normal CO2 value.
async function seedHistory() {
  for (let k = 7; k >= 1; k--) {
    await submitCheckIn({ module: 'environment', raw: env(1.5), now: at(shiftDayKey(TODAY, -k)), refresh: async () => {} })
  }
}
const streakNow = async () => computeStreak(await getCheckInDays(), TODAY, loadCheckinConfig().minModulesPerDay)

async function submitToday(co2) {
  let data
  const res = await submitCheckIn({ module: 'environment', raw: env(co2), now: NOW, refresh: async (t) => { data = await buildDashboardData(t) } })
  return { res, data }
}

describe('check-in integration', () => {
  it('changes environment_overall when CO2 goes above the act edge, and leaves the streak the same', async () => {
    expect(actEdge).toBe(3)
    await seedHistory()
    const before = overall(await buildDashboardData(NOW - 1), 'environment')
    expect(before.status).toBe('normal')

    const normal = await submitToday(1.5)
    expect(overall(normal.data, 'environment').status).toBe('normal')
    const streakWithNormal = await streakNow()

    await db.readings.where('timestamp').equals(NOW).delete()
    await db.checkins.where('dayKey').equals(TODAY).delete()

    const high = await submitToday(actEdge + 0.4)
    const after = overall(high.data, 'environment')
    expect(after.status).toBe('act')
    expect(after.status).not.toBe(before.status)
    expect(after.escalate).toBe(true)
    expect(await streakNow()).toBe(streakWithNormal)
    expect(streakWithNormal).toBe(8)
    expect(high.res).toMatchObject({ status: 'saved', streakBefore: 7, streakAfter: 8 })
  })

  it('stores Isolation readings from the Isolation form and updates the isolation alert', async () => {
    let data
    const res = await submitCheckIn({
      module: 'isolation',
      raw: { sleep: '7', mood: '3', social: '60', reaction: '' },
      now: NOW,
      refresh: async (t) => { data = await buildDashboardData(t) },
    })
    expect(res.status).toBe('saved')
    for (const indicator of ['sleep_hours', 'mood', 'social_contact']) {
      expect(await getReadings({ domain: 'isolation', indicator })).toHaveLength(1)
    }
    expect(await getReadings({ domain: 'isolation', indicator: 'reaction_ms' })).toHaveLength(0)
    expect(await getReadings({ domain: 'environment', indicator: 'sleep_hours' })).toHaveLength(1)
    expect(overall(data, 'isolation')).toBeDefined()
  })

  it('calls refresh once with the submit time, after the save', async () => {
    const order = []
    const refresh = vi.fn(async () => {
      order.push(await db.readings.count())
    })
    await submitCheckIn({ module: 'gravity', raw: { exercise: '5' }, now: NOW, refresh })
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(refresh).toHaveBeenCalledWith(NOW)
    expect(order).toEqual([1])
  })

  it('keeps the data and reports saved_rerun_failed when refresh rejects', async () => {
    const res = await submitCheckIn({ module: 'gravity', raw: { exercise: '5' }, now: NOW, refresh: async () => { throw new Error('engine down') } })
    expect(res.status).toBe('saved_rerun_failed')
    expect(await db.readings.count()).toBe(1)
    expect(await db.checkins.count()).toBe(1)
  })

  it('feeds radiation symptoms from the Radiation form into the radiation alert', async () => {
    const quiet = overall(await buildDashboardData(NOW), 'radiation')
    let data
    await submitCheckIn({
      module: 'radiation',
      raw: { symptoms: { nausea: true, vomiting: true, fatigue: false, skin: false, fever: false, bruising: false } },
      now: NOW,
      refresh: async (t) => { data = await buildDashboardData(t) },
    })
    expect(overall(data, 'radiation').urgency).toBeGreaterThan(quiet.urgency)
  })
})