import { describe, it, expect } from 'vitest'
import { medianReaction, summarizeReaction, nextWaitMs, NOT_ENOUGH_TAPS } from './reaction.js'

describe('medianReaction', () => {
  it('handles odd, even and single lists', () => {
    expect(medianReaction([300, 100, 200])).toBe(200)
    expect(medianReaction([400, 100, 200, 300])).toBe(250)
    expect(medianReaction([321])).toBe(321)
  })
  it('does not mutate its input', () => {
    const t = [3, 1, 2]
    medianReaction(t)
    expect(t).toEqual([3, 1, 2])
  })
})

describe('summarizeReaction', () => {
  it('fails with 4 taps and passes with 5', () => {
    expect(summarizeReaction([1, 2, 3, 4], 5)).toEqual({ ok: false, message: 'Not enough taps. Please run the reaction check again.' })
    expect(NOT_ENOUGH_TAPS).toBe('Not enough taps. Please run the reaction check again.')
    expect(summarizeReaction([300, 310, 320, 330, 340], 5)).toEqual({ ok: true, median: 320 })
  })
  it('fails for an empty list', () => {
    expect(summarizeReaction([], 5).ok).toBe(false)
  })
})

describe('nextWaitMs', () => {
  it('stays in [2000, 6000)', () => {
    expect(nextWaitMs(0)).toBe(2000)
    expect(nextWaitMs(0.5)).toBe(4000)
    expect(nextWaitMs(0.999)).toBeLessThan(6000)
  })
})