import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { validateCutoffs } from './validateCutoffs.js'
import { reconcileCutoffs } from './reconcileCutoffs.js'

// Feature: core, Property 18: Cutoffs validation and precedence
// **Validates: Requirements 5.7, 5.8**

const num = fc.integer({ min: 0, max: 100 })
const badValue = fc.constantFrom(NaN, Infinity, -Infinity, '5', null, undefined, {}, true)
const validPair = fc
  .tuple(num, num)
  .filter(([a, b]) => a < b)
  .map(([watch_from, act_from]) => ({ watch_from, act_from, source: 'design value' }))
const moduleName = fc.stringMatching(/^[a-z]{3,12}$/)

describe('Property 18: Cutoffs validation and precedence', () => {
  it('validateCutoffs accepts valid cutoffs', () => {
    fc.assert(
      fc.property(validPair, (c) => {
        expect(validateCutoffs(c)).toBe(c)
      }),
      { numRuns: 100 }
    )
  })

  it('validateCutoffs throws for missing cutoffs', () => {
    fc.assert(
      fc.property(fc.constantFrom(null, undefined, 5, 'x', []), (c) => {
        expect(() => validateCutoffs(c)).toThrow()
      }),
      { numRuns: 100 }
    )
  })

  it('validateCutoffs throws for missing or non-finite values', () => {
    fc.assert(
      fc.property(validPair, fc.constantFrom('watch_from', 'act_from'), badValue, (c, key, bad) => {
        const broken = { ...c, [key]: bad }
        if (bad === undefined) delete broken[key]
        expect(() => validateCutoffs(broken)).toThrow()
      }),
      { numRuns: 100 }
    )
  })

  it('validateCutoffs throws when watch_from >= act_from', () => {
    fc.assert(
      fc.property(
        fc.tuple(num, num).filter(([a, b]) => a >= b),
        ([watch_from, act_from]) => {
          expect(() => validateCutoffs({ watch_from, act_from, source: 'design value' })).toThrow()
        }
      ),
      { numRuns: 100 }
    )
  })

  it('reconcileCutoffs returns shared cutoffs and one warning naming the module when urgency differs', () => {
    fc.assert(
      fc.property(
        validPair,
        fc.tuple(num, num),
        moduleName,
        (cutoffs, [w, a], name) => {
          fc.pre(w !== cutoffs.watch_from || a !== cutoffs.act_from)
          const rules = { urgency: { watch_from: w, act_from: a } }
          const res = reconcileCutoffs(rules, cutoffs, name)
          expect(res.cutoffs).toBe(cutoffs)
          expect(res.warnings).toHaveLength(1)
          expect(res.warnings[0]).toContain(name)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('reconcileCutoffs returns no warnings when urgency is absent or equal', () => {
    fc.assert(
      fc.property(validPair, moduleName, fc.boolean(), (cutoffs, name, withBlock) => {
        const rules = withBlock
          ? { urgency: { watch_from: cutoffs.watch_from, act_from: cutoffs.act_from } }
          : {}
        const res = reconcileCutoffs(rules, cutoffs, name)
        expect(res.cutoffs).toBe(cutoffs)
        expect(res.warnings).toEqual([])
      }),
      { numRuns: 100 }
    )
  })
})
