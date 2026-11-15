import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { evaluate } from './evaluate.js'

const DAY = 86_400_000
const NOW = 1_700_000_000_000
const CUTOFFS = { watch_from: 30, act_from: 60, source: 'design value' }

// Reference band lookup, written independently of evaluate.js.
// Band layout used by the generator: normal [-inf, a), watch [a, b), act [b, +inf).
function refStatus(x, a, b) {
  if (x >= b) return 'act'
  if (x >= a) return 'watch'
  return 'normal'
}

function makeBands(prefix, a, b) {
  return {
    normal: { [`${prefix}max`]: a },
    watch: { [`${prefix}min`]: a, [`${prefix}max`]: b },
    act: { [`${prefix}min`]: b },
  }
}

function makeRule(bands, fallback) {
  const rule = {
    label: 'Test indicator',
    unit: 'u',
    bad_direction: 'high',
    bands,
    why: 'Moved {delta} {unit} from reference.',
    action: 'Do something.',
    source: 'design value',
    severity_span: 1,
  }
  if (fallback) rule.fallback_bands = fallback
  return rule
}

const FAMILIES = ['z_', 'abs_z_', 'value_']

// Pool of at least 5 readings on distinct days, values not all equal (sd > 0).
const readyPool = fc
  .tuple(
    fc.uniqueArray(fc.integer({ min: 1, max: 13 }), { minLength: 5, maxLength: 13 }),
    fc.array(fc.integer({ min: -50, max: 50 }), { minLength: 13, maxLength: 13 }),
  )
  .map(([days, vals]) => days.map((d, i) => ({ timestamp: NOW - d * DAY, value: vals[i] })))
  .filter((pool) => new Set(pool.map((r) => r.value)).size > 1)

const smallPool = fc
  .tuple(
    fc.uniqueArray(fc.integer({ min: 1, max: 13 }), { minLength: 0, maxLength: 4 }),
    fc.array(fc.integer({ min: -50, max: 50 }), { minLength: 4, maxLength: 4 }),
  )
  .map(([days, vals]) => days.map((d, i) => ({ timestamp: NOW - d * DAY, value: vals[i] })))

const thresholds = fc
  .tuple(fc.integer({ min: -60, max: 60 }), fc.integer({ min: 1, max: 40 }))
  .map(([a, gap]) => [a, a + gap])

const latestValue = fc.integer({ min: -120, max: 120 })

function run(rule, pool, x) {
  const readings = [...pool, { timestamp: NOW, value: x }]
  return evaluate(rule, readings, { now: NOW, cutoffs: CUTOFFS, domain: 'nutrition', indicator: 'test' })
}

describe('evaluate: status matches the band', () => {
  // Feature: core, Property 8: Status matches the band
  // **Validates: Requirements 3.1, 3.11**
  it('ready baseline: status equals the reference band for each key family (drift may only raise normal to watch)', () => {
    fc.assert(
      fc.property(fc.constantFrom(...FAMILIES), thresholds, readyPool, latestValue, (family, [a, b], pool, x) => {
        const n = pool.length
        const mean = pool.reduce((s, r) => s + r.value, 0) / n
        const sd = Math.sqrt(pool.reduce((s, r) => s + (r.value - mean) ** 2, 0) / (n - 1))
        const z = (x - mean) / sd
        const basis = family === 'z_' ? z : family === 'abs_z_' ? Math.abs(z) : x
        const expected = refStatus(basis, a, b)

        const alert = run(makeRule(makeBands(family, a, b)), pool, x)

        expect(alert.baseline).not.toBeNull()
        if (expected === 'normal') {
          expect(['normal', 'watch']).toContain(alert.status)
        } else {
          expect(alert.status).toBe(expected)
        }
      }),
      { numRuns: 200 },
    )
  })

  it('value_ family: _min is inclusive and _max is exclusive at the exact boundaries', () => {
    fc.assert(
      fc.property(thresholds, readyPool, ([a, b], pool) => {
        const rule = makeRule(makeBands('value_', a, b))
        expect(run(rule, pool, a).status).toBe('watch') // a is watch (inclusive min)
        expect(run(rule, pool, b).status).toBe('act') // b is act (inclusive min), not watch (exclusive max)
        if (b - a >= 1) expect(run(rule, pool, b - 0.5).status).toBe('watch')
      }),
      { numRuns: 100 },
    )
  })

  it('baseline not ready: baseline is null and status comes from fallback_bands or own value_ bands', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...FAMILIES),
        fc.boolean(),
        thresholds,
        thresholds,
        smallPool,
        latestValue,
        (family, useFallback, [a, b], [fa, fb], pool, x) => {
          let rule
          let expected
          if (family === 'value_') {
            rule = makeRule(makeBands('value_', a, b), useFallback ? makeBands('value_', fa, fb) : undefined)
            expected = useFallback ? refStatus(x, fa, fb) : refStatus(x, a, b)
          } else if (useFallback) {
            rule = makeRule(makeBands(family, a, b), makeBands('value_', fa, fb))
            expected = refStatus(x, fa, fb)
          } else {
            rule = makeRule(makeBands(family, a, b))
            expected = 'normal'
          }

          const alert = run(rule, pool, x)

          expect(alert.baseline).toBeNull()
          expect(alert.status).toBe(expected)
        },
      ),
      { numRuns: 200 },
    )
  })
})
