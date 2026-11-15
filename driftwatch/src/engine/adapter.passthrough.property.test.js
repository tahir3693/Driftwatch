// Feature: core, Property 22: Plain-function alerts pass through unchanged
// **Validates: Requirements 8.3**
import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { defineModule, runModules } from './adapter.js'
import { DOMAINS } from '../data/domains.js'

const valueArb = fc.oneof(fc.double({ noNaN: true, noDefaultInfinity: true }), fc.string(), fc.boolean())

const alertArb = (domain, indicator) =>
  fc.record({
    domain: fc.constant(domain),
    indicator: fc.constant(indicator),
    value: valueArb,
    baseline: valueArb,
    status: fc.constantFrom('normal', 'watch', 'act'),
    urgency: fc.double({ min: 0, max: 100, noNaN: true }),
    why: fc.string(),
    action: fc.string(),
    escalate: fc.boolean(),
    source: fc.string(),
  })

const scenarioArb = fc.constantFrom(...DOMAINS).chain((domain) =>
  fc.record({
    domain: fc.constant(domain),
    extras: fc.uniqueArray(fc.stringMatching(/^[a-z]{1,8}$/), { maxLength: 4 }).chain((names) =>
      fc.tuple(...names.map((n) => alertArb(domain, `ind_${n}`)))
    ),
    overall: alertArb(domain, `${domain}_overall`),
    readings: fc.dictionary(fc.string(), fc.array(fc.double({ noNaN: true, noDefaultInfinity: true }), { maxLength: 5 }), { maxKeys: 3 }),
  })
)

describe('Property 22: Plain-function alerts pass through unchanged', () => {
  it('returns deeply equal alerts and passes the readings to the function', () => {
    fc.assert(
      fc.property(scenarioArb, ({ domain, extras, overall, readings }) => {
        const produced = [...extras, overall]
        let received
        const mod = defineModule({
          name: 'fn',
          domain,
          kind: 'function',
          run: (r) => {
            received = r
            return produced
          },
        })
        const res = runModules([mod], { [domain]: readings }, { cutoffs: {}, now: 0 })
        expect(res.errors).toEqual([])
        expect(res.alerts).toEqual(produced)
        expect(received).toBe(readings)
      }),
      { numRuns: 100 }
    )
  })
})
