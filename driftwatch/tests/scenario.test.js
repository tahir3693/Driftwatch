import 'fake-indexeddb/auto'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../src/store/db.js'
import { saveReading, getReadings } from '../src/store/readings.js'
import { loadCutoffs } from '../src/data/cutoffs.js'
import { defineModule, runModules } from '../src/engine/adapter.js'
import { validateAlert } from '../src/engine/validateAlert.js'
import { reconcileCutoffs } from '../src/engine/reconcileCutoffs.js'
import environment from '../src/modules/environment/index.js'
import { evaluate as evaluateRadiation } from '../src/modules/radiation/radiation-engine.js'

const DAY = 86_400_000
const START = 1_700_000_000_000
const NOW = START + 13 * DAY

// Simulated 14-day scenario. Sleep drifts down slowly but stays above a fixed 6 h line.
const SLEEP = [7.3, 6.7, 7.2, 6.8, 7.1, 6.9, 7.3, 6.7, 6.9, 6.8, 6.7, 6.6, 6.5, 6.4]
const ENV_INDICATORS = {
  cabin_co2_mmHg: (i) => 2.0 + (i % 2) * 0.05,
  cabin_co2_7day_avg_mmHg: (i) => 1.9 + (i % 3) * 0.02,
  symptom_check: () => 0,
  body_temperature: (i) => 36.6 + (i % 2) * 0.1,
  sleep_hours: (i) => SLEEP[i],
}
const RAD_INDICATORS = {
  cumulative_dose_mSv: (i) => 20 + i * 0.5,
  proton_flux_pfu: () => 5,
}
const FIXED_SLEEP_LINE = 6

let envReadings
let radReadings
let seen

const recorder = defineModule({
  name: 'radiation',
  domain: 'radiation',
  kind: 'function',
  run: (readings, ctx) => {
    seen.push(ctx.cutoffs)
    const last = (k) => readings[k][readings[k].length - 1].value
    return [
      ...evaluateRadiation({
        cumulativeDose_mSv: last('cumulative_dose_mSv'),
        premissionDose_mSv: 0,
        protonFlux_pfu: last('proton_flux_pfu'),
        symptoms: [],
      }),
    ]
  },
})

const probe = defineModule({
  name: 'probe',
  domain: 'system',
  kind: 'function',
  run: (_r, ctx) => {
    seen.push(ctx.cutoffs)
    return [
      {
        domain: 'system',
        indicator: 'system_overall',
        value: 0,
        baseline: null,
        status: 'normal',
        urgency: 0,
        why: 'ok',
        action: 'none',
        escalate: false,
        source: 'design value',
      },
    ]
  },
})

async function readAll(domain, indicators) {
  const out = {}
  for (const indicator of Object.keys(indicators)) {
    out[indicator] = await getReadings({ domain, indicator, windowDays: 14, now: NOW })
  }
  return out
}

beforeAll(async () => {
  await db.readings.clear()
  for (let i = 0; i < 14; i++) {
    const timestamp = START + i * DAY
    for (const [indicator, f] of Object.entries(ENV_INDICATORS)) {
      await saveReading({ domain: 'environment', indicator, timestamp, value: f(i) })
    }
    for (const [indicator, f] of Object.entries(RAD_INDICATORS)) {
      await saveReading({ domain: 'radiation', indicator, timestamp, value: f(i) })
    }
  }
  envReadings = await readAll('environment', ENV_INDICATORS)
  radReadings = await readAll('radiation', RAD_INDICATORS)
})

beforeEach(() => {
  seen = []
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('14-day shared scenario', () => {
  it('reads the saved scenario back from the store, oldest first', () => {
    for (const rs of [...Object.values(envReadings), ...Object.values(radReadings)]) {
      expect(rs).toHaveLength(14)
      expect(rs.map((r) => r.timestamp)).toEqual([...rs.map((r) => r.timestamp)].sort((a, b) => a - b))
    }
    expect(envReadings.sleep_hours.map((r) => r.value)).toEqual(SLEEP)
  })

  it('gives every module the same cutoffs object', () => {
    const cutoffs = loadCutoffs()
    const ctx = { cutoffs, now: NOW }
    const readingsByDomain = { environment: envReadings, radiation: radReadings, system: {} }
    const res = runModules([environment, recorder, probe], readingsByDomain, ctx)
    expect(res.errors).toEqual([])
    expect(seen).toHaveLength(2)
    for (const c of seen) expect(c).toBe(cutoffs)
    expect(loadCutoffs()).toBe(cutoffs)
    // the rules module receives the same shared object back from reconcile
    expect(reconcileCutoffs(environment.rules, cutoffs, 'environment').cutoffs).toBe(cutoffs)
  })

  it('returns valid alerts and an overall alert for both module kinds', () => {
    const ctx = { cutoffs: loadCutoffs(), now: NOW }
    const res = runModules([environment, recorder], { environment: envReadings, radiation: radReadings }, ctx)
    expect(res.errors).toEqual([])
    expect(res.alerts.length).toBeGreaterThan(0)
    for (const a of res.alerts) expect(validateAlert(a)).toEqual({ ok: true })
    const names = res.alerts.map((a) => a.indicator)
    expect(names).toContain('environment_overall')
    expect(names).toContain('radiation_overall')
  })

  it('raises watch for a slow drift before a fixed band is crossed', () => {
    const ctx = { cutoffs: loadCutoffs(), now: NOW }
    const res = runModules([environment], { environment: envReadings }, ctx)
    const sleep = res.alerts.find((a) => a.indicator === 'sleep_hours')
    expect(sleep.value).toBeGreaterThan(FIXED_SLEEP_LINE)
    expect(sleep.status).toBe('watch')
    expect(sleep.why).toMatch(/drift/i)
    const co2 = res.alerts.find((a) => a.indicator === 'cabin_co2_mmHg')
    expect(co2.status).toBe('normal')
  })

  it('returns warnings and errors without logging them', () => {
    const spies = ['log', 'warn', 'error', 'info', 'debug'].map((m) => vi.spyOn(console, m))
    const ctx = { cutoffs: loadCutoffs(), now: NOW }
    const broken = defineModule({
      name: 'broken',
      domain: 'system',
      kind: 'function',
      run: () => {
        throw new Error('boom')
      },
    })
    const res = runModules([environment, broken], { environment: envReadings }, ctx)
    expect(Array.isArray(res.warnings)).toBe(true)
    expect(res.errors).toEqual([{ module: 'broken', error: 'boom' }])
    for (const s of spies) expect(s).not.toHaveBeenCalled()
  })
})
