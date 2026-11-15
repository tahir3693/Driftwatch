import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { evaluate } from './evaluate.js'
import { computeBaseline } from './computeBaseline.js'

// Feature: core, Property 15: Drift inside the normal band yields a watch with an explanation
// **Validates: Requirements 4.2, 4.3**

const DAY = 86_400_000
const NOW = 30 * DAY
const cutoffs = { watch_from: 30, act_from: 60, source: 'design value' }
const opts = { now: NOW, cutoffs, domain: 'isolation', indicator: 'sleep' }

// The normal band is wide, so the latest reading is always in `normal` by the
// bands alone. Only the CUSUM signal can raise the status to `watch`.
const makeRule = (k, h) => ({
  label: 'Sleep',
  unit: 'h',
  why: 'Sleep is {delta} {unit} off your usual.',
  action: 'Protect a full sleep period tonight.',
  source: 'design value',
  bad_direction: 'high',
  drift: { k, h },
  bands: {
    normal: { z_max: 1e6 },
    watch: { z_min: 1e6, z_max: 2e6 },
    act: { z_min: 2e6 },
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

describe('evaluate drift property', () => {
  it('drift inside the normal band gives watch, and why names the baseline and the days', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.integer({ min: -100, max: 100 }), { minLength: 5, maxLength: 13 }),
        fc.double({ min: 0.1, max: 2, noNaN: true }), // k
        fc.double({ min: 0.1, max: 3, noNaN: true }), // h
        fc.double({ min: 0.5, max: 20, noNaN: true }), // margin above k + h
        (pool, k, h, margin) => {
          const base = computeBaseline(pool.map((value, i) => ({
            timestamp: NOW - (pool.length - i) * DAY,
            value,
          })), 14, { now: NOW })
          expect(base.ready).toBe(true)
          expect(base.sd).toBeGreaterThan(0)

          const zTarget = k + h + margin
          const latest = base.mean + zTarget * base.sd
          const alert = evaluate(makeRule(k, h), build(pool, latest), opts)

          expect(alert.status).toBe('watch')
          expect(alert.why).toMatch(/personal baseline/i)
          expect(alert.why).toMatch(/\d+ days?/)
        },
      ),
      { numRuns: 100 },
    )
  })
})
