// Feature: core, Property 25: A throwing module does not stop the others
// **Validates: Requirements 8.7**
import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { defineModule, runModules } from './adapter.js'
import { DOMAINS } from '../data/domains.js'

const mkAlert = (domain, indicator) => ({
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
})

describe('Property 25: module failure isolation', () => {
  it('reports each thrower by name and still returns alerts of the others', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            domain: fc.constantFrom(...DOMAINS),
            throws: fc.boolean(),
            msg: fc.string({ minLength: 1 }),
          }),
          { maxLength: 8 }
        ),
        (specs) => {
          const mods = specs.map((s, i) =>
            defineModule({
              name: `mod${i}`,
              domain: s.domain,
              kind: 'function',
              run: () => {
                if (s.throws) throw new Error(s.msg)
                return [mkAlert(s.domain, s.domain + '_overall')]
              },
            })
          )
          const { alerts, errors } = runModules(mods, {}, { cutoffs: {}, now: 0 })

          specs.forEach((s, i) => {
            const name = `mod${i}`
            const errs = errors.filter((e) => e.module === name)
            if (s.throws) {
              expect(errs.length).toBe(1)
              expect(errs[0].error).toBe(s.msg)
            } else {
              expect(errs.length).toBe(0)
            }
          })
          const expected = specs.filter((s) => !s.throws).length
          expect(alerts.length).toBe(expected)
        }
      ),
      { numRuns: 100 }
    )
  })
})
