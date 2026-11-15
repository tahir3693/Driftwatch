import { describe, it, expect } from 'vitest'
import { deriveSymptomCode } from './symptomCheck.js'

describe('deriveSymptomCode', () => {
  it('gives 2 for nausea with fatigue (2.5)', () => {
    expect(deriveSymptomCode({ headache: false, nauseaFatigue: true }, [false, false])).toBe(2)
  })
  it('gives 2 for a headache today and on both prior days (2.6)', () => {
    expect(deriveSymptomCode({ headache: true, nauseaFatigue: false }, [true, true])).toBe(2)
  })
  it('gives 1 for a headache today and on one prior day (2.7), including the boundary of only one', () => {
    expect(deriveSymptomCode({ headache: true, nauseaFatigue: false }, [true, false])).toBe(1)
    expect(deriveSymptomCode({ headache: true, nauseaFatigue: false }, [false, true])).toBe(1)
  })
  it('gives 0 otherwise (2.8)', () => {
    expect(deriveSymptomCode({ headache: true, nauseaFatigue: false }, [false, false])).toBe(0)
    expect(deriveSymptomCode({ headache: false, nauseaFatigue: false }, [true, true])).toBe(0)
  })
  it('treats a missing prior list as no history', () => {
    expect(deriveSymptomCode({ headache: true, nauseaFatigue: false }, undefined)).toBe(0)
  })
})