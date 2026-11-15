import { describe, it, expect } from 'vitest'
import { getModuleDescriptors } from './moduleList.js'
import { DOMAINS } from './domains.js'
import { runModules } from '../engine/adapter.js'
import { loadCutoffs } from './cutoffs.js'

describe('getModuleDescriptors', () => {
  const list = getModuleDescriptors()

  it('returns radiation, isolation, gravity, environment and nutrition in that order', () => {
    expect(list.map((d) => d.domain)).toEqual(['radiation', 'isolation', 'gravity', 'environment', 'nutrition'])
  })

  it('uses function modules for radiation, isolation and gravity and rules modules for the others', () => {
    expect(list.map((d) => d.kind)).toEqual(['function', 'function', 'function', 'rules', 'rules'])
  })

  it('has valid domains, frozen descriptors and no bmd-strength entry', () => {
    for (const d of list) {
      expect(DOMAINS).toContain(d.domain)
      expect(Object.isFrozen(d)).toBe(true)
    }
    expect(list.some((d) => d.name === 'bmd-strength')).toBe(false)
  })
})

describe('getModuleDescriptors with runModules', () => {
  it('covers five distinct check-in domains', () => {
    const domains = getModuleDescriptors().map((d) => d.domain)
    expect(new Set(domains).size).toBe(5)
    expect([...domains].sort()).toEqual(['environment', 'gravity', 'isolation', 'nutrition', 'radiation'])
  })
  it('returns each <domain>_overall or a reported error for empty input, without throwing', () => {
    const list = getModuleDescriptors()
    const now = 1_800_000_000_000
    let result
    expect(() => {
      result = runModules(list, {}, { cutoffs: loadCutoffs(), now })
    }).not.toThrow()
    for (const d of list) {
      const hasOverall = result.alerts.some((a) => a.domain === d.domain && a.indicator === `${d.domain}_overall`)
      const hasError = result.errors.some((e) => JSON.stringify(e).includes(d.domain))
      expect(hasOverall || hasError, d.domain).toBe(true)
    }
  })
})
