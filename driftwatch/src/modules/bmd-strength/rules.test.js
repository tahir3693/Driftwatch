import { describe, it, expect } from 'vitest'
import rules from './rules.json'
import { validateRules } from '../../engine/validateRules.js'
import { BMD_SOURCE, STRENGTH_SOURCE } from './engineAdapter.js'

describe('bmd-strength rules', () => {
  it('passes validateRules and keeps domain gravity', () => {
    expect(validateRules(rules, 'bmd-strength')).toBe(true)
    expect(rules.domain).toBe('gravity')
    expect(rules.storage_key).toBe('orbit-journal-v1')
  })

  it('holds the tracker limits as data', () => {
    const { bmd_ratio: bmd, strength_ratio: strength, missed_training_days: missed } = rules.indicators
    expect(bmd.bands).toEqual({ normal: { value_min: 0.98 }, watch: { value_min: 0.95, value_max: 0.98 }, act: { value_max: 0.95 } })
    expect(strength.bands).toEqual({ normal: { value_min: 0.9 }, watch: { value_min: 0.8, value_max: 0.9 }, act: { value_max: 0.8 } })
    expect(missed.bands).toEqual({ normal: { value_max: 2 }, watch: { value_min: 2, value_max: 4 }, act: { value_min: 4 } })
  })

  it('says "possible" and refers to the flight surgeon in every Watch and Act text', () => {
    for (const rule of Object.values(rules.indicators)) {
      for (const t of [rule, rule.messages.watch]) {
        expect(t.why).toMatch(/possible/)
        expect(t.action).toMatch(/flight surgeon/)
      }
      expect(rule.messages.normal.action).toMatch(/flight surgeon/)
      expect(rule.messages.no_data.action).toMatch(/flight surgeon/)
    }
  })

  it('has help text for every indicator and never tells anyone to take supplements', () => {
    for (const rule of Object.values(rules.indicators)) {
      expect(rule.howToMeasure.length).toBeGreaterThan(0)
      expect(rule.whyItMatters.length).toBeGreaterThan(0)
    }
    const text = JSON.stringify(rules).toLowerCase()
    expect(text).not.toMatch(/supplement/)
    expect(text).not.toMatch(/diagnosed|you have osteoporosis/)
  })
  it('shows the same source in the help text as the alerts carry', () => {
    expect(rules.indicators.bmd_ratio.source).toBe(BMD_SOURCE)
    expect(rules.indicators.strength_ratio.source).toBe(STRENGTH_SOURCE)
  })
  it('does not let the teammate engine folder add a second rules.json to the module globs', () => {
    const found = Object.keys(import.meta.glob('../*/rules.json'))
    // Same pattern as modules.test.js (./*/rules.json from src/modules); this file sits in bmd-strength.
    expect(found).toContain('./rules.json')
    expect(found.filter((f) => f.includes('teammate'))).toEqual([])
  })})
