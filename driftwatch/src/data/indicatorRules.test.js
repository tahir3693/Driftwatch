import { describe, it, expect } from 'vitest'
import { loadIndicatorRules } from './indicatorRules.js'
import bmd from '../modules/bmd-strength/rules.json'
import { DOMAINS } from './domains.js'

const rules = loadIndicatorRules()
const HELP = ['howToMeasure', 'whyItMatters', 'action', 'source']

describe('loadIndicatorRules', () => {
  it('keys have the form domain/indicator with a known domain', () => {
    expect(Object.keys(rules).length).toBeGreaterThan(0)
    for (const key of Object.keys(rules)) {
      const [domain, indicator, ...rest] = key.split('/')
      expect(DOMAINS).toContain(domain)
      expect(indicator).toBeTruthy()
      expect(rest).toEqual([])
    }
  })

  it('covers environment, gravity, nutrition and isolation and yields nothing for radiation', () => {
    const domains = new Set(Object.keys(rules).map((k) => k.split('/')[0]))
    for (const d of ['environment', 'gravity', 'nutrition', 'isolation']) expect(domains.has(d)).toBe(true)
    expect(domains.has('radiation')).toBe(false)
  })

  it('carries a label and the four help fields', () => {
    for (const [key, rule] of Object.entries(rules)) {
      expect(typeof rule.label, key).toBe('string')
      for (const f of HELP) expect(typeof rule[f], `${key} ${f}`).toBe('string')
    }
  })

  it('has an entry per BMD and strength measure', () => {
    const measures = Object.values(bmd.indicators).flatMap((r) => r.measures)
    expect(measures).toHaveLength(6)
    for (const m of measures) {
      const rule = rules[`gravity/${m.indicator}`]
      expect(rule, m.indicator).toBeDefined()
      expect(rule.label).toBe(m.label)
    }
  })
  it('uses the ratio unit for the ratio indicators, because the alert value is the ratio to baseline', () => {
    for (const k of ['hip_bmd', 'lumbar_spine_bmd', 'deadlift_strength', 'bench_press_strength']) {
      expect(rules[`gravity/${k}`].unit, k).toBe('ratio of baseline')
    }
    expect(rules['gravity/strength_training_missed_days'].unit).toBe('days')
  })
  it('leaves an unknown key absent', () => {
    expect(rules['gravity/nope']).toBeUndefined()
  })
})
