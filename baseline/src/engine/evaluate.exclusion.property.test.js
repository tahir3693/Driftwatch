import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { evaluate } from './evaluate.js'

// Feature: core, Property 6: Evaluated reading is excluded from the baseline
// **Validates: Requirements 2.5**

const DAY = 86_400_000
const NOW = 30 * DAY
const cutoffs = { watch_from: 30, act_from: 60, source: 'design value' }
const opts = { now: NOW, cutoffs, domain: 'isolation', indicator: 'sleep' }

const rule = {
  label: 'Sleep',
  unit: 'h',
  why: 'Sleep is {delta} {unit} off your usual.',
  action: 'Protect a full sleep period tonight.',
  source: 'design value',
  bad_direction: 'low',
  bands: {
    normal: { z_min: -1 },
    watch: { z_min: -2, z_max: -1 },
    act: { z_max: -2 },
  },
}

const val = fc.double({ min: -1000, max: 1000, noNaN: true })

const build = (pool, latest) => [
  ...pool.map((value, i) => ({
    timestamp: NOW - (pool.length - i) * DAY,
    domain: 'isolation',
    indicator: 'sleep',
    value,
  })),
  { timestamp: NOW, domain: 'isolation', indicator: 'sleep', value: latest },
]

describe('evaluate baseline exclusion property', () => {
  it('changing only the latest value leaves the reported baseline unchanged', () => {
    fc.assert(
      fc.property(
        fc.array(val, { minLength: 0, maxLength: 20 }),
        val,
        val,
        (pool, a, b) => {
          const r1 = evaluate(rule, build(pool, a), opts)
          const r2 = evaluate(rule, build(pool, b), opts)
          expect(Object.is(r1.baseline, r2.baseline)).toBe(true)
        },
      ),
      { numRuns: 100 },
    )
  })
})
