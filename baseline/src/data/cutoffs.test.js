import { describe, it, expect, vi, afterEach } from 'vitest'
import { loadCutoffs } from './cutoffs.js'
import * as cutoffsModule from './cutoffs.js'

afterEach(() => {
  vi.doUnmock('./cutoffs.json')
  vi.resetModules()
})

describe('loadCutoffs', () => {
  it('returns the design values', () => {
    const c = loadCutoffs()
    expect(c.watch_from).toBe(30)
    expect(c.act_from).toBe(60)
    expect(c.source).toBe('design value')
  })

  it('returns the same frozen object on repeated calls', () => {
    const a = loadCutoffs()
    expect(loadCutoffs()).toBe(a)
    expect(Object.isFrozen(a)).toBe(true)
  })

  it('exports only loadCutoffs', () => {
    expect(Object.keys(cutoffsModule)).toEqual(['loadCutoffs'])
  })

  it('throws when the JSON is invalid', async () => {
    vi.resetModules()
    vi.doMock('./cutoffs.json', () => ({ default: { watch_from: 70, act_from: 60, source: 'x' } }))
    const mod = await import('./cutoffs.js')
    expect(() => mod.loadCutoffs()).toThrow('watch_from')
  })
})
