import { describe, it, expect } from 'vitest'
import { validateCutoffs, CutoffsError } from './validateCutoffs.js'

const valid = { watch_from: 30, act_from: 60, source: 'design value' }

describe('validateCutoffs', () => {
  it('returns a valid object', () => {
    expect(validateCutoffs(valid)).toBe(valid)
  })

  it.each([undefined, null, 'x', 5, []])('throws for missing content %p', (input) => {
    expect(() => validateCutoffs(input)).toThrow(CutoffsError)
  })

  it('throws when a cutoff is missing', () => {
    expect(() => validateCutoffs({ act_from: 60, source: 's' })).toThrow(CutoffsError)
    expect(() => validateCutoffs({ watch_from: 30, source: 's' })).toThrow(CutoffsError)
  })

  it('throws when source is missing', () => {
    expect(() => validateCutoffs({ watch_from: 30, act_from: 60 })).toThrow(CutoffsError)
  })

  it.each([NaN, Infinity, -Infinity, '30'])('throws for non-finite watch_from %p', (v) => {
    expect(() => validateCutoffs({ ...valid, watch_from: v })).toThrow(CutoffsError)
  })

  it('throws for non-finite act_from', () => {
    expect(() => validateCutoffs({ ...valid, act_from: Infinity })).toThrow(CutoffsError)
  })

  it('throws when watch_from >= act_from', () => {
    expect(() => validateCutoffs({ ...valid, watch_from: 60 })).toThrow(CutoffsError)
    expect(() => validateCutoffs({ ...valid, watch_from: 70 })).toThrow(CutoffsError)
  })

  it('names the error CutoffsError', () => {
    try {
      validateCutoffs(null)
    } catch (e) {
      expect(e.name).toBe('CutoffsError')
    }
  })
})
