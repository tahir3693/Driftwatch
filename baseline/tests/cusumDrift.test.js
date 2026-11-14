import { describe, it, expect } from 'vitest'
import { cusum, DRIFT_DEFAULTS } from '../src/engine/drift.js'
import { computeBaseline } from '../src/engine/computeBaseline.js'
import { zScore } from '../src/engine/zScore.js'
import { evaluate } from '../src/engine/evaluate.js'
import { loadCutoffs } from '../src/data/cutoffs.js'
import environment from '../src/modules/environment/rules.json'

const DAY = 86_400_000
const cutoffs = loadCutoffs()
const WATCH_Z = 2 // the z band edge used by the environment temperature and sleep rules

describe('CUSUM flags a slow drift before a fixed threshold', () => {
  it('uses the documented defaults k = 0.5 and h = 3', () => {
    expect(DRIFT_DEFAULTS).toEqual({ k: 0.5, h: 3 })
  })

  it('signals on day 7 of a 0.3 sd-per-day ramp, one day before z reaches 2', () => {
    const z = Array.from({ length: 10 }, (_, t) => 0.3 * t) // 0, 0.3, ... 2.7
    const r = cusum(z)
    const firstBandDay = z.findIndex((v) => v >= WATCH_Z)
    expect(r.drift).toBe(true)
    expect(r.signalIndex).toBe(6)
    expect(firstBandDay).toBe(7)
    expect(r.signalIndex).toBeLessThan(firstBandDay)
  })

  it('stays quiet while every value is at or below the reference value k', () => {
    expect(cusum([0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5]).drift).toBe(false)
    expect(cusum([-1, 0.2, -0.4, 0.5, 0, 0.1]).drift).toBe(false)
  })

  it('gives no signal for a flat series', () => {
    expect(cusum(new Array(30).fill(0))).toMatchObject({ drift: false, signalIndex: -1 })
  })

  it('a higher threshold h never signals earlier', () => {
    const z = Array.from({ length: 20 }, (_, t) => 0.3 * t)
    const low = cusum(z, { k: 0.5, h: 2 }).signalIndex
    const high = cusum(z, { k: 0.5, h: 5 }).signalIndex
    expect(low).toBeGreaterThanOrEqual(0)
    expect(high).toBeGreaterThanOrEqual(low)
  })

  it('resets its run length when the series returns to the baseline', () => {
    const r = cusum([2, 2, -3, 0, 0], { k: 0.5, h: 10 })
    expect(r.drift).toBe(false)
    expect(r.runLength).toBe(0)
  })

  it('evaluate warns with watch while sleep is still inside the normal band', () => {
    const rule = environment.indicators.sleep_hours
    // the first five nights vary a little (sd about 0.46 h), then sleep slips 0.2 h a night
    const sleep = [7.9, 6.8, 7.6, 6.9, 7.3, 7.1, 6.9, 6.7, 6.5, 6.3, 6.1, 5.9, 5.7, 5.5]
    let firstWatch = -1
    for (let i = 5; i < sleep.length; i++) {
      const readings = sleep.slice(0, i + 1).map((value, d) => ({ timestamp: (d + 1) * DAY, value }))
      const a = evaluate(rule, readings, { now: (i + 1) * DAY, cutoffs, domain: 'environment', indicator: 'sleep_hours' })
      if (a.status !== 'normal') {
        firstWatch = i
        // the same reading on its own z band would still be normal: the warning came from drift
        const pool = readings.slice(0, -1)
        const base = computeBaseline(pool, rule.baseline_days ?? 14, { now: (i + 1) * DAY })
        expect(zScore(a.value, base, rule.fallback_spread)).toBeGreaterThan(-WATCH_Z)
        expect(a.why).toMatch(/drift/i)
        break
      }
    }
    expect(firstWatch).toBeGreaterThanOrEqual(5)
  })
})


