import { describe, it, expect } from 'vitest'
import { defineModule, runModules } from './adapter.js'

const CUTOFFS = Object.freeze({ watch_from: 30, act_from: 60, source: 'design value' })
const NOW = 14 * 86_400_000

const alert = (domain, indicator, over = {}) => ({
  domain,
  indicator,
  value: 1,
  baseline: 1,
  status: 'normal',
  urgency: 0,
  why: 'ok',
  action: 'none',
  escalate: false,
  source: 'design value',
  ...over,
})

const band = (family) => ({
  normal: { [`${family}_max`]: 1 },
  watch: { [`${family}_min`]: 1, [`${family}_max`]: 2 },
  act: { [`${family}_min`]: 2 },
})

const makeRules = (urgency) => ({
  module: 'environment',
  ...(urgency ? { urgency } : {}),
  indicators: {
    co2: {
      label: 'CO2',
      unit: 'ppm',
      bad_direction: 'high',
      bands: band('value'),
      why: 'CO2 is {delta} {unit} above usual.',
      action: 'Check scrubbers.',
      howToMeasure: 'Read the sensor.',
      whyItMatters: 'High CO2 causes headaches.',
      source: 'design value',
    },
  },
  patterns: {},
})

const readings = () => ({
  co2: Array.from({ length: 8 }, (_, i) => ({
    timestamp: NOW - (7 - i) * 86_400_000,
    domain: 'environment',
    indicator: 'co2',
    value: 0.5,
  })),
})

const fnModule = (run, name = 'radiation') => defineModule({ name, domain: 'radiation', kind: 'function', run })
const rulesModule = (rules = makeRules()) =>
  defineModule({ name: 'environment', domain: 'environment', kind: 'rules', rules })

describe('defineModule', () => {
  it('returns a frozen function descriptor', () => {
    const m = fnModule(() => [])
    expect(Object.isFrozen(m)).toBe(true)
    expect(m).toMatchObject({ name: 'radiation', domain: 'radiation', kind: 'function' })
  })

  it('returns a frozen rules descriptor', () => {
    const m = rulesModule()
    expect(Object.isFrozen(m)).toBe(true)
    expect(m.kind).toBe('rules')
  })

  it('names the module for an unknown kind', () => {
    expect(() => defineModule({ name: 'foo', domain: 'radiation', kind: 'x' })).toThrow(/foo/)
  })

  it('names the module when run is missing', () => {
    expect(() => defineModule({ name: 'foo', domain: 'radiation', kind: 'function' })).toThrow(/foo/)
  })

  it('names the module for a bad domain', () => {
    expect(() => defineModule({ name: 'foo', domain: 'mars', kind: 'function', run() {} })).toThrow(/foo/)
  })

  it('validates rules for a rules module', () => {
    const bad = makeRules()
    delete bad.indicators.co2.source
    expect(() => defineModule({ name: 'environment', domain: 'environment', kind: 'rules', rules: bad })).toThrow(
      /co2/
    )
  })
})

describe('runModules', () => {
  const ctx = { cutoffs: CUTOFFS, now: NOW }

  it('passes valid function-module alerts through unchanged', () => {
    const out = [alert('radiation', 'dose'), alert('radiation', 'radiation_overall')]
    const res = runModules([fnModule(() => out)], {}, ctx)
    expect(res.errors).toEqual([])
    expect(res.alerts).toEqual(out)
    expect(res.alerts[0]).toBe(out[0])
  })

  it('calls function modules with run(readings, ctx)', () => {
    const rd = [{ timestamp: 1 }]
    let args
    const m = fnModule((...a) => {
      args = a
      return [alert('radiation', 'radiation_overall')]
    })
    runModules([m], { radiation: rd }, ctx)
    expect(args[0]).toBe(rd)
    expect(args[1]).toBe(ctx)
  })

  it('drops an invalid alert and reports module, indicator, field, message', () => {
    const bad = alert('radiation', 'dose', { status: 'Watch' })
    const m = fnModule(() => [bad, alert('radiation', 'radiation_overall')])
    const res = runModules([m], {}, ctx)
    expect(res.alerts.map((a) => a.indicator)).toEqual(['radiation_overall'])
    expect(res.errors).toHaveLength(1)
    expect(res.errors[0]).toMatchObject({ module: 'radiation', indicator: 'dose', field: 'status' })
    expect(typeof res.errors[0].message).toBe('string')
  })

  it('reports a missing overall alert', () => {
    const res = runModules([fnModule(() => [alert('radiation', 'dose')])], {}, ctx)
    expect(res.errors).toHaveLength(1)
    expect(res.errors[0].module).toBe('radiation')
    expect(res.errors[0].error).toMatch(/radiation_overall/)
  })

  it('reports a throwing module and still runs the others', () => {
    const boom = fnModule(() => {
      throw new Error('kaboom')
    })
    const good = rulesModule()
    const res = runModules([boom, good], { environment: readings() }, ctx)
    expect(res.errors).toEqual([{ module: 'radiation', error: 'kaboom' }])
    expect(res.alerts.map((a) => a.indicator)).toEqual(['co2', 'environment_overall'])
  })

  it('runs a rules module with one alert per indicator plus overall', () => {
    const res = runModules([rulesModule()], { environment: readings() }, ctx)
    expect(res.errors).toEqual([])
    expect(res.alerts.map((a) => a.indicator)).toEqual(['co2', 'environment_overall'])
  })

  it('warns when the rules urgency block differs from the shared cutoffs', () => {
    const rules = makeRules({ watch_from: 25, act_from: 70, source: 'design value' })
    const res = runModules([rulesModule(rules)], { environment: readings() }, ctx)
    expect(res.warnings).toHaveLength(1)
    expect(res.warnings[0]).toMatch(/environment/)
  })

  it('gives no warning when the urgency block matches', () => {
    const rules = makeRules({ watch_from: 30, act_from: 60, source: 'design value' })
    const res = runModules([rulesModule(rules)], { environment: readings() }, ctx)
    expect(res.warnings).toEqual([])
  })

  it('passes the identical cutoffs object to a function module', () => {
    const seen = []
    const m = fnModule((_r, c) => {
      seen.push(c.cutoffs)
      return [alert('radiation', 'radiation_overall')]
    })
    runModules([m], {}, ctx)
    expect(seen[0]).toBe(ctx.cutoffs)
  })

  it('passes the identical cutoffs object to a rules module (and to every module)', () => {
    // Differing urgency block triggers reconcile; the shared object must still be used.
    const rules = makeRules({ watch_from: 25, act_from: 70, source: 'design value' })
    const rulesMod = rulesModule(rules)
    const seen = []
    const fn = fnModule((_r, c) => {
      seen.push(c.cutoffs)
      return [alert('radiation', 'radiation_overall')]
    })
    // Use a spy-free check: a rules alert's escalate uses cutoffs.act_from (60), not the block's 70.
    const shared = { watch_from: 30, act_from: 60, source: 'design value' }
    const c = { cutoffs: shared, now: NOW }
    const hot = readings()
    hot.co2 = hot.co2.map((r) => ({ ...r, value: 5 }))
    const res = runModules([fn, rulesMod], { environment: hot }, c)
    expect(seen[0]).toBe(shared)
    const co2 = res.alerts.find((a) => a.indicator === 'co2')
    expect(co2.status).toBe('act')
    expect(co2.urgency).toBeGreaterThanOrEqual(shared.act_from)
    expect(co2.escalate).toBe(true)
  })
})
