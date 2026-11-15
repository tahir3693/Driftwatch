import { describe, it } from 'vitest'
import fc from 'fast-check'
import { medianReaction, summarizeReaction, nextWaitMs } from './reaction.js'

const times = fc.array(fc.integer({ min: 100, max: 2000 }), { minLength: 1, maxLength: 40 })

// Feature: checkin, Property 9: Median is bounded and order independent
describe('median properties', () => {
  it('is between min and max and ignores order', () => {
    fc.assert(
      fc.property(times, (list) => {
        const m = medianReaction(list)
        const sorted = [...list].sort((a, b) => a - b)
        return m >= Math.min(...list) && m <= Math.max(...list) && medianReaction([...list].reverse()) === m && medianReaction(sorted) === m
      }),
      { numRuns: 200 },
    )
  })
  it('summarizeReaction gives no median under minTaps and a median from minTaps up', () => {
    fc.assert(
      fc.property(times, fc.integer({ min: 1, max: 12 }), (list, minTaps) => {
        const r = summarizeReaction(list, minTaps)
        return list.length < minTaps ? r.ok === false && !('median' in r) : r.ok === true && r.median === medianReaction(list)
      }),
      { numRuns: 200 },
    )
  })
  it('nextWaitMs is at least 2000 and below 6000', () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 1, noNaN: true, maxExcluded: true }), (r) => nextWaitMs(r) >= 2000 && nextWaitMs(r) < 6000),
      { numRuns: 200 },
    )
  })
})