import { describe, it, expect } from 'vitest'
import { mean, stdDev } from '../src/engine/stats.js'
import { computeBaseline } from '../src/engine/computeBaseline.js'
import { zScore } from '../src/engine/zScore.js'
import { evaluate } from '../src/engine/evaluate.js'
import { loadCutoffs } from '../src/data/cutoffs.js'
import nutrition from '../src/modules/nutrition/rules.json'
import environment from '../src/modules/environment/rules.json'

const DAY = 86_400_000
const cutoffs = loadCutoffs()
const rd = (values, start = 1) => values.map((value, i) => ({ timestamp: (start + i) * DAY, value }))

describe('baseline and z-score maths (hand-checked numbers)', () => {
  const values = [2, 4, 4, 4, 5, 5, 7, 9] // mean 5, sum of squares 32, sample variance 32/7

  it('mean and sample standard deviation use the n - 1 divisor', () => {
    expect(mean(values)).toBe(5)
    expect(stdDev(values)).toBeCloseTo(Math.sqrt(32 / 7), 12)
    expect(stdDev([10, 10, 10])).toBe(0)
  })

  it('computeBaseline returns mean, sd and n when there are 5 or more readings', () => {
    const b = computeBaseline(rd(values), 14, { now: 8 * DAY })
    expect(b.ready).toBe(true)
    expect(b.n).toBe(8)
    expect(b.mean).toBe(5)
    expect(b.sd).toBeCloseTo(2.138089935, 8)
  })

  it('is not ready at 4 readings and has no mean or sd', () => {
    const b = computeBaseline(rd([1, 2, 3, 4]), 14, { now: 4 * DAY })
    expect(b).toEqual({ ready: false, n: 4 })
    expect('mean' in b).toBe(false)
    expect('sd' in b).toBe(false)
  })

  it('is ready at exactly 5 readings', () => {
    expect(computeBaseline(rd([1, 2, 3, 4, 5]), 14, { now: 5 * DAY }).ready).toBe(true)
  })

  it('counts only readings inside the window, including the oldest edge', () => {
    // window of 3 days ending at day 10 keeps days 7, 8, 9, 10
    const b = computeBaseline(rd([100, 100, 1, 2, 3, 4, 5, 6, 7, 8].map((v, i) => v), 1), 3, { now: 10 * DAY, minReadings: 1 })
    expect(b.n).toBe(4)
    expect(b.mean).toBe((5 + 6 + 7 + 8) / 4)
  })

  it('gives the same baseline for any order of the same readings', () => {
    const a = computeBaseline(rd(values), 14, { now: 8 * DAY })
    const shuffled = [...rd(values)].reverse()
    expect(computeBaseline(shuffled, 14, { now: 8 * DAY })).toEqual(a)
  })

  it('z-score is (value - mean) / sd', () => {
    const b = { ready: true, mean: 5, sd: Math.sqrt(32 / 7), n: 8 }
    expect(zScore(9, b)).toBeCloseTo(4 / Math.sqrt(32 / 7), 12)
    expect(zScore(5, b)).toBe(0)
    expect(zScore(1, b)).toBeCloseTo(-4 / Math.sqrt(32 / 7), 12)
  })

  it('z-score never gives NaN or Infinity when sd is 0', () => {
    const flat = { ready: true, mean: 7, sd: 0, n: 5 }
    expect(zScore(7, flat)).toBe(0)
    expect(zScore(9, flat)).toBe(2) // fallback spread 1
    expect(zScore(9, flat, 0.5)).toBe(4)
    expect(Number.isFinite(zScore(9, flat, 0))).toBe(true)
  })

  it('evaluate leaves the reading being evaluated out of the baseline', () => {
    const rule = environment.indicators.body_temperature
    const pool = [36.5, 36.6, 36.4, 36.6, 36.5]
    const readings = [...pool, 99].map((value, i) => ({ timestamp: (i + 1) * DAY, value }))
    const a = evaluate(rule, readings, { now: 6 * DAY, cutoffs, domain: 'environment', indicator: 'body_temperature' })
    expect(a.baseline).toBeCloseTo(mean(pool), 12)
    expect(a.value).toBe(99)
  })

  it('evaluate reports baseline null until 5 earlier readings exist', () => {
    const rule = nutrition.indicators.intake_pct_of_plan
    const four = rd([100, 99, 100, 98, 97])
    const a = evaluate(rule, four, { now: 5 * DAY, cutoffs, domain: 'nutrition', indicator: 'intake_pct_of_plan' })
    expect(a.baseline).toBeNull() // only 4 earlier readings
    const six = rd([100, 99, 100, 98, 99, 97])
    const b = evaluate(rule, six, { now: 6 * DAY, cutoffs, domain: 'nutrition', indicator: 'intake_pct_of_plan' })
    expect(b.baseline).toBeCloseTo((100 + 99 + 100 + 98 + 99) / 5, 12)
  })
})
