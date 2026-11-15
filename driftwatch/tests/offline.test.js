import { describe, it, expect, vi, afterEach } from 'vitest'
import fc from 'fast-check'
import { defineModule, runModules } from '../src/engine/adapter.js'
import { loadCutoffs } from '../src/data/cutoffs.js'

const DAY = 86_400_000
const NOW = 20 * DAY

const band = {
  normal: { value_max: 5 },
  watch: { value_min: 5, value_max: 8 },
  act: { value_min: 8 },
}

const rules = {
  module: 'environment',
  indicators: {
    co2: {
      label: 'CO2',
      unit: 'ppm',
      bad_direction: 'high',
      bands: band,
      why: 'CO2 is {delta} {unit} above usual.',
      action: 'Check scrubbers.',
      howToMeasure: 'Read the sensor.',
      whyItMatters: 'High CO2 causes headaches.',
      source: 'design value',
    },
  },
  patterns: {},
}

const fnAlert = (indicator, value) => ({
  domain: 'radiation',
  indicator,
  value,
  baseline: null,
  status: 'normal',
  urgency: 0,
  why: 'ok',
  action: 'none',
  escalate: false,
  source: 'design value',
})

const modules = [
  defineModule({ name: 'environment', domain: 'environment', kind: 'rules', rules }),
  defineModule({
    name: 'radiation',
    domain: 'radiation',
    kind: 'function',
    run: (readings) => {
      const sum = (readings ?? []).reduce((s, r) => s + r.value, 0)
      return [fnAlert('dose', sum), fnAlert('radiation_overall', sum)]
    },
  }),
]

const run = (values) => {
  const co2 = values.map((value, i) => ({
    timestamp: NOW - (values.length - 1 - i) * DAY,
    domain: 'environment',
    indicator: 'co2',
    value,
  }))
  const dose = values.map((value, i) => ({
    timestamp: NOW - (values.length - 1 - i) * DAY,
    domain: 'radiation',
    indicator: 'dose',
    value,
  }))
  return runModules(modules, { environment: { co2 }, radiation: dose }, { cutoffs: loadCutoffs(), now: NOW })
}

describe('offline equivalence', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  // Feature: core, Property 21: Same output online and offline
  // Validates: Requirements 7.1, 7.2, 7.3, 7.4
  it('gives identical results with the network failing or working, and makes no calls', () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ min: 0, max: 12, noNaN: true }), { minLength: 1, maxLength: 20 }),
        (values) => {
          const failing = vi.fn(() => {
            throw new Error('offline')
          })
          const failingXhr = vi.fn(function () {
            throw new Error('offline')
          })
          vi.stubGlobal('fetch', failing)
          vi.stubGlobal('XMLHttpRequest', failingXhr)
          const offline = run(values)

          const ok = vi.fn(() => Promise.resolve({ ok: true, json: () => ({}) }))
          const okXhr = vi.fn(function () {
            this.open = () => {}
            this.send = () => {}
          })
          vi.stubGlobal('fetch', ok)
          vi.stubGlobal('XMLHttpRequest', okXhr)
          const online = run(values)

          expect(online).toEqual(offline)
          expect(offline.errors).toEqual([])
          expect(failing).not.toHaveBeenCalled()
          expect(failingXhr).not.toHaveBeenCalled()
          expect(ok).not.toHaveBeenCalled()
          expect(okXhr).not.toHaveBeenCalled()
        }
      ),
      { numRuns: 100 }
    )
  })
})
