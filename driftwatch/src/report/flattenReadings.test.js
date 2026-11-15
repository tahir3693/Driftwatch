import { describe, it, expect } from 'vitest'
import { flattenReadings } from './flattenReadings.js'

const r = (indicator, value) => ({ timestamp: 1, domain: 'nutrition', indicator, value })

describe('flattenReadings', () => {
  it('concatenates the arrays in key order', () => {
    const a = r('a', 1)
    const b = r('b', 2)
    const c = r('c', 3)
    expect(flattenReadings({ 'x/1': [a, b], 'x/2': [c] })).toEqual([a, b, c])
  })

  it('ignores values that are not arrays', () => {
    const a = r('a', 1)
    expect(flattenReadings({ k1: 'no', k2: [a], k3: null, k4: 5, k5: { length: 1 } })).toEqual([a])
  })

  it('gives [] for null, undefined, arrays and primitives', () => {
    for (const bad of [null, undefined, [], 'x', 3, true]) expect(flattenReadings(bad)).toEqual([])
  })

  it('does not change the input map', () => {
    const input = { k: [r('a', 1)] }
    const copy = JSON.parse(JSON.stringify(input))
    flattenReadings(input)
    expect(input).toEqual(copy)
  })

  it('keeps the same Reading objects (no copy)', () => {
    const a = r('a', 1)
    expect(flattenReadings({ k: [a] })[0]).toBe(a)
  })
})
