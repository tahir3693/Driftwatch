import { describe, it, expect } from 'vitest'
import { mean, stdDev } from './stats.js'

describe('mean', () => {
  it('averages values', () => {
    expect(mean([1, 2, 3, 4])).toBe(2.5)
  })
  it('returns 0 for empty input', () => {
    expect(mean([])).toBe(0)
  })
})

describe('stdDev', () => {
  it('uses the n - 1 divisor', () => {
    // mean 5, squared deviations sum 32, 32 / 7
    expect(stdDev([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(Math.sqrt(32 / 7), 12)
  })
  it('is 0 for constant values', () => {
    expect(stdDev([3, 3, 3])).toBe(0)
  })
  it('is 0 for fewer than two values', () => {
    expect(stdDev([])).toBe(0)
    expect(stdDev([5])).toBe(0)
  })
})
