// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { renderHook, waitFor, act , cleanup } from '@testing-library/react'
import { db } from './db.js'
import { saveReading } from './readings.js'
import { useDashboardData, buildDashboardData } from './dashboardData.js'
import { validateAlert } from '../engine/validateAlert.js'
import { flattenReadings } from '../report/flattenReadings.js'
import { buildGroundReport } from '../report/buildGroundReport.js'
import { loadReportConfig } from '../data/reportConfig.js'

afterEach(cleanup)

const flags = vi.hoisted(() => ({ throwModules: false }))
vi.mock('../data/moduleList.js', async (importOriginal) => {
  const original = await importOriginal()
  return {
    ...original,
    getModuleDescriptors: () => {
      if (flags.throwModules) throw new Error('module list failed')
      return original.getModuleDescriptors()
    },
  }
})

const DAY = 86_400_000
const NOW = 1_800_000_000_000

beforeEach(async () => {
  flags.throwModules = false
  await db.readings.clear()
  localStorage.clear()
})
afterEach(() => vi.restoreAllMocks())

const overall = (data, domain) => data.alerts.find((a) => a.indicator === `${domain}_overall`)

describe('useDashboardData', () => {
  it('starts loading, then is ready and empty with no stored readings', async () => {
    const { result } = renderHook(() => useDashboardData())
    expect(result.current.data.status).toBe('loading')
    await waitFor(() => expect(result.current.data.status).toBe('ready'))
    expect(result.current.data.hasReadings).toBe(false)
    expect(result.current.data.alerts.length).toBeGreaterThan(0)
    for (const a of result.current.data.alerts) expect(validateAlert(a)).toEqual({ ok: true })
  })

  it('shows alerts after saving readings and refresh(now)', async () => {
    const { result } = renderHook(() => useDashboardData())
    await waitFor(() => expect(result.current.data.status).toBe('ready'))
    for (let i = 0; i < 6; i++) {
      await saveReading({ domain: 'nutrition', indicator: 'intake_pct_of_plan', timestamp: NOW - (6 - i) * DAY, value: i < 5 ? 100 : 70 })
    }
    await act(async () => {
      await result.current.refresh(NOW)
    })
    const data = result.current.data
    expect(data.hasReadings).toBe(true)
    expect(data.readings['nutrition/intake_pct_of_plan']).toHaveLength(6)
    expect(overall(data, 'nutrition')).toBeDefined()
    expect(data.baselineStats['nutrition/intake_pct_of_plan']).toBeDefined()
  })

  it('has baselineStats only for indicators whose baseline is ready', async () => {
    for (let i = 0; i < 3; i++) {
      await saveReading({ domain: 'nutrition', indicator: 'intake_pct_of_plan', timestamp: NOW - (3 - i) * DAY, value: 100 })
    }
    const data = await buildDashboardData(NOW)
    expect(data.baselineStats).toEqual({})
  })

  it('puts radiation readings under radiation/<indicator> and feeds the radiation module', async () => {
    await saveReading({ domain: 'radiation', indicator: 'proton_flux_pfu', timestamp: NOW - 1000, value: 1500 })
    await saveReading({ domain: 'radiation', indicator: 'symptom_nausea', timestamp: NOW - 1000, value: 1 })
    const data = await buildDashboardData(NOW)
    expect(data.readings['radiation/proton_flux_pfu']).toHaveLength(1)
    expect(data.readings['radiation/symptom_nausea']).toHaveLength(1)
    expect(overall(data, 'radiation')).toBeDefined()
    expect(data.alerts.find((a) => a.indicator === 'solar_proton_flux').value).toBe(1500)
  })

  it('keeps radiation dose and symptom readings in readings, for first load and refresh, and the report lists them', async () => {
    await saveReading({ domain: 'radiation', indicator: 'cumulative_dose_mSv', timestamp: NOW - 2 * DAY, value: 150 })
    await saveReading({ domain: 'radiation', indicator: 'cumulative_dose_mSv', timestamp: NOW - 1000, value: 160 })
    await saveReading({ domain: 'radiation', indicator: 'symptom_nausea', timestamp: NOW - 1000, value: 1 })
    await saveReading({ domain: 'nutrition', indicator: 'intake_pct_of_plan', timestamp: NOW - 1000, value: 90 })
    const checkKeys = (data) => {
      expect(data.readings['radiation/cumulative_dose_mSv'].map((r) => r.value)).toEqual([150, 160])
      expect(data.readings['radiation/symptom_nausea']).toHaveLength(1)
      for (const k of ['premission_dose_mSv', 'proton_flux_pfu', 'symptom_vomiting', 'symptom_fatigue', 'symptom_skin', 'symptom_fever', 'symptom_bruising']) {
        expect(data.readings[`radiation/${k}`]).toEqual([])
      }
      // existing rules-based readings are still there, and radiation has no rules entries
      expect(data.readings['nutrition/intake_pct_of_plan']).toHaveLength(1)
      expect(data.rules['radiation/cumulative_dose_mSv']).toBeUndefined()
    }
    checkKeys(await buildDashboardData(NOW))
    // first load through the hook
    const { result } = renderHook(() => useDashboardData())
    await waitFor(() => expect(result.current.data.status).toBe('ready'))
    await act(async () => {
      await result.current.refresh(NOW)
    })
    checkKeys(result.current.data)
    const data = result.current.data
    const model = buildGroundReport({ alerts: data.alerts, readings: flattenReadings(data.readings), rules: data.rules, now: NOW, config: loadReportConfig() })
    const radiationRows = model.lastReadings.filter((r) => r.domain === 'radiation')
    expect(radiationRows.map((r) => [r.indicator, r.indicatorLabel, r.unit, r.value])).toEqual([
      ['cumulative_dose_mSv', 'cumulative_dose_mSv', '', 160],
      ['symptom_nausea', 'symptom_nausea', '', 1],
    ])
    expect(model.lastReadings.some((r) => r.domain === 'nutrition' && r.unit === '% of plan')).toBe(true)
  })
  it('returns an empty ready DashboardData when Dexie fails to read', async () => {
    vi.spyOn(db.readings, 'where').mockImplementation(() => {
      throw new Error('boom')
    })
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { result } = renderHook(() => useDashboardData())
    await waitFor(() => expect(result.current.data.status).toBe('ready'))
    expect(result.current.data.alerts).toEqual([])
    expect(result.current.data.hasReadings).toBe(false)
  })

  it('passes the saved BMD tracker state into the gravity alerts', async () => {
    const state = {
      measurements: [
        { id: 'b', created: 1, date: '2025-01-01', baseline: true, hip: 1.0, lumbar: 1.0, deadlift: 100, bench: 100 },
        { id: 'c', created: 2, date: '2025-01-10', baseline: false, hip: 0.9 },
      ],
      weeklyWorkouts: {},
    }
    localStorage.setItem('orbit-journal-v1', JSON.stringify(state))
    const data = await buildDashboardData(NOW)
    const hip = data.alerts.find((a) => a.indicator === 'hip_bmd')
    expect(hip.status).toBe('act')
    expect(data.rules['gravity/hip_bmd'].label).toBe('Hip BMD')
  })
})

describe('simulated 14-day scenario through the hook', () => {
  it('loads only into an empty store and day 14 matches the scenario statuses', async () => {
    const { result } = renderHook(() => useDashboardData())
    await waitFor(() => expect(result.current.data.status).toBe('ready'))
    expect(result.current.data.hasReadings).toBe(false)
    await act(async () => {
      await result.current.loadScenario()
    })
    const data = result.current.data
    expect(data.hasReadings).toBe(true)
    for (const a of data.alerts) expect(validateAlert(a)).toEqual({ ok: true })
    const iso = overall(data, 'isolation')
    expect(iso.status).toBe('act')
    expect(iso.escalate).toBe(true)
    for (const d of ['environment', 'gravity', 'nutrition']) expect(overall(data, d).status, d).toBe('watch')
    expect(overall(data, 'radiation').status).not.toBe('act')
    expect(data.readings['radiation/proton_flux_pfu']).toHaveLength(14)
  })

  it('does not reload or delete when readings already exist', async () => {
    await saveReading({ domain: 'nutrition', indicator: 'intake_pct_of_plan', timestamp: NOW - 1000, value: 90 })
    const { result } = renderHook(() => useDashboardData())
    await waitFor(() => expect(result.current.data.status).toBe('ready'))
    await act(async () => {
      await result.current.loadScenario()
    })
    expect(await db.readings.count()).toBe(1)
  })
})

describe('check-in refresh', () => {
  const co2 = (i, value) => ({ domain: 'environment', indicator: 'cabin_co2_mmHg', timestamp: NOW - (7 - i) * DAY, value })

  it('shows environment_overall after saving CO2 Readings and refresh, without a remount', async () => {
    const { result } = renderHook(() => useDashboardData())
    await waitFor(() => expect(result.current.data.status).toBe('ready'))
    expect(overall(result.current.data, 'environment')?.status).toBe('normal')
    expect(result.current.data.hasReadings).toBe(false)
    for (let i = 0; i < 7; i++) await saveReading(co2(i, 1.5))
    await saveReading({ ...co2(7, 3.4), timestamp: NOW })
    await act(async () => {
      await result.current.refresh(NOW)
    })
    const env = overall(result.current.data, 'environment')
    expect(env.status).toBe('act')
    expect(result.current.data.readings['environment/cabin_co2_mmHg']).toHaveLength(8)
  })

  it('lets saved radiation symptoms reach the radiation alert', async () => {
    const before = overall(await buildDashboardData(NOW), 'radiation')
    for (const k of ['nausea', 'vomiting', 'fatigue']) {
      await saveReading({ domain: 'radiation', indicator: `symptom_${k}`, timestamp: NOW - 1000, value: 1 })
    }
    const after = overall(await buildDashboardData(NOW), 'radiation')
    expect(after.urgency).toBeGreaterThan(before.urgency)
  })

  it('rejects refresh when the build throws', async () => {
    const { result } = renderHook(() => useDashboardData())
    await waitFor(() => expect(result.current.data.status).toBe('ready'))
    flags.throwModules = true
    await expect(result.current.refresh(NOW)).rejects.toThrow('module list failed')
  })
})