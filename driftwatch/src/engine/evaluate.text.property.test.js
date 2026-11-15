import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { evaluate } from './evaluate.js'
import { computeBaseline } from './computeBaseline.js'

// Feature: core, Property 11: Text fields come from the rules
// **Validates: Requirements 3.7**

const DAY = 86_400_000
const NOW = 30 * DAY
const cutoffs = { watch_from: 30, act_from: 60, source: 'design value' }
const opts = { now: NOW, cutoffs, domain: 'isolation', indicator: 'sleep' }

const word = fc.stringMatching(/^[A-Za-z0-9 .,]{1,12}$/)
const unit = fc.stringMatching(/^[A-Za-z%]{1,4}$/)
// Integers avoid subnormal spreads whose z-scores overflow the drift threshold.
const val = fc.integer({ min: -1000, max: 1000 })

// Templates always contain {delta} and {unit}, possibly more than once.
const template = fc
  .tuple(word, word, word, fc.boolean())
  .map(([a, b, c, twice]) =>
    twice ? `${a} {delta} {unit} ${b} {delta} {unit} ${c}` : `${a} {delta} ${b} {unit} ${c}`,
  )

const ruleArb = fc.record({
  unit,
  why: template,
  action: word,
  source: fc.oneof(word, fc.constant('design value')),
  bad_direction: fc.constantFrom('low', 'high', 'both'),
})

const makeRule = (r) => ({
  label: 'Sleep',
  ...r,
  // Infinite threshold disables drift. A finite h (even 1e12) can be exceeded
  // when the pool has zero spread, which makes the z-score Infinity.
  drift: { k: 0.5, h: Infinity },
  bands: {
    normal: { z_min: -1, z_max: 1 },
    watch: { z_min: -2, z_max: -1 },
    act: { z_max: -2 },
  },
  fallback_bands: {
    normal: { value_min: 6 },
    watch: { value_min: 5, value_max: 6 },
    act: { value_max: 5 },
  },
})

const build = (pool, latest) => [
  ...pool.map((value, i) => ({
    timestamp: NOW - (pool.length - i) * DAY,
    domain: 'isolation',
    indicator: 'sleep',
    value,
  })),
  { timestamp: NOW, domain: 'isolation', indicator: 'sleep', value: latest },
]

const expectedWhy = (rule, delta) =>
  rule.why.split('{delta}').join(String(delta)).split('{unit}').join(rule.unit)

describe('evaluate text fields property', () => {
  it('why has delta and unit filled, action and source equal the rule values (ready baseline)', () => {
    fc.assert(
      fc.property(
        ruleArb,
        fc.array(val, { minLength: 5, maxLength: 20 }),
        val,
        (r, pool, latest) => {
          const rule = makeRule(r)
          const readings = build(pool, latest)
          const alert = evaluate(rule, readings, opts)
          const base = computeBaseline(readings.slice(0, -1), 14, { now: NOW })
          expect(base.ready).toBe(true)
          const delta = Math.round(Math.abs(latest - base.mean) * 100) / 100

          expect(alert.why).toBe(expectedWhy(rule, delta))
          expect(alert.why).toContain(rule.unit)
          expect(alert.why).not.toMatch(/\{[^}]*\}/)
          expect(alert.action).toBe(rule.action)
          expect(alert.source).toBe(rule.source)
        },
      ),
      { numRuns: 100 },
    )
  })

  it('text fields come from the rule when the baseline is not ready', () => {
    fc.assert(
      fc.property(
        ruleArb,
        fc.array(val, { minLength: 0, maxLength: 3 }),
        val,
        (r, pool, latest) => {
          const rule = makeRule(r)
          const alert = evaluate(rule, build(pool, latest), opts)
          expect(alert.baseline).toBeNull()
          expect(alert.why).toContain(rule.unit)
          expect(alert.why).not.toMatch(/\{[^}]*\}/)
          expect(alert.action).toBe(rule.action)
          expect(alert.source).toBe(rule.source)
        },
      ),
      { numRuns: 100 },
    )
  })
})
