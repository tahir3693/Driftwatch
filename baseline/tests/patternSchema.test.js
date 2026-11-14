import { describe, it, expect } from 'vitest'
import { validateRules } from '../src/engine/validateRules.js'
import sample from './fixtures/rules.sample.json'

const bundled = import.meta.glob('../src/modules/*/rules.json', { eager: true, import: 'default' })

const REQUIRED = ['needs', 'min_in_watch', 'for_days', 'result', 'escalate', 'why', 'action', 'source']

function assertPatternSchema(rules) {
  for (const [name, p] of Object.entries(rules.patterns ?? {})) {
    for (const key of REQUIRED) {
      expect(p, `pattern "${name}" field "${key}"`).toHaveProperty(key)
    }
    expect(Array.isArray(p.needs) && p.needs.length > 0).toBe(true)
    expect(Number.isInteger(p.min_in_watch)).toBe(true)
    expect(Number.isInteger(p.for_days)).toBe(true)
    expect(['watch', 'act']).toContain(p.result)
    expect(typeof p.escalate).toBe('boolean')
    for (const key of ['why', 'action', 'source']) expect(typeof p[key]).toBe('string')
  }
}

describe('pattern schema', () => {
  it('fixture passes validateRules and has one pattern', () => {
    expect(validateRules(sample, 'sample')).toBe(true)
    expect(Object.keys(sample.patterns)).toHaveLength(1)
    assertPatternSchema(sample)
  })

  it('fixture has one indicator per band family', () => {
    const families = Object.values(sample.indicators).map((i) => Object.keys(i.bands.watch)[0].replace(/(min|max)$/, ''))
    expect(families.sort()).toEqual(['abs_z_', 'value_', 'z_'])
  })

  it('finds the bundled rules files', () => {
    expect(Object.keys(bundled).length).toBeGreaterThan(0)
  })

  for (const [path, rules] of Object.entries(bundled)) {
    it(`every pattern in ${path} has the full schema`, () => {
      assertPatternSchema(rules)
    })
  }
})
