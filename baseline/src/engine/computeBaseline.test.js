import { describe, it, expect } from 'vitest'
import { computeBaseline } from './computeBaseline.js'
import { mean, stdDev } from './stats.js'

const DAY = 86_400_000
const mk = (day, value) => ({
  timestamp: day * DAY,
  domain: 'environment',
  indicator: 'co2',
  value,
})

describe('computeBaseline', () => {
  const values = [10, 12, 11, 13, 14, 12]
  const readings = values.map((v, i) => mk(i, v))

  it('is ready with mean, sd and n', () => {
    const b = computeBaseline(readings, 14, { now: 5 * DAY })
    expect(b).toEqual({ ready: true, mean: mean(values), sd: stdDev(values), n: 6 })
  })

  it('is not ready at 4 readings and has no mean or sd', () => {
    const b = computeBaseline(readings.slice(0, 4), 14)
    expect(b).toEqual({ ready: false, n: 4 })
    expect('mean' in b).toBe(false)
    expect('sd' in b).toBe(false)
  })

  it('is ready at exactly 5 readings', () => {
    expect(computeBaseline(readings.slice(0, 5), 14).ready).toBe(true)
  })

  it('gives identical output for shuffled input', () => {
    const shuffled = [readings[3], readings[0], readings[5], readings[2], readings[4], readings[1]]
    expect(computeBaseline(shuffled, 14)).toEqual(computeBaseline(readings, 14))
  })

  it('does not mutate the input order', () => {
    const shuffled = [readings[3], readings[0], readings[5]]
    const copy = [...shuffled]
    computeBaseline(shuffled, 14)
    expect(shuffled).toEqual(copy)
  })

  it('works with two arguments, defaulting now to the latest timestamp', () => {
    const b = computeBaseline(readings, 2)
    // latest is day 5; window [day 3, day 5] holds 3 readings
    expect(b).toEqual({ ready: false, n: 3 })
  })

  it('filters to the window inclusive of both ends', () => {
    const b = computeBaseline(readings, 3, { now: 5 * DAY, minReadings: 1 })
    expect(b.n).toBe(4) // days 2..5
    const c = computeBaseline(readings, 14, { now: 3 * DAY, minReadings: 1 })
    expect(c.n).toBe(4) // days 0..3, later readings excluded
  })

  it('handles empty input', () => {
    expect(computeBaseline([], 14)).toEqual({ ready: false, n: 0 })
  })
})
