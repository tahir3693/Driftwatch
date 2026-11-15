import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { DOMAINS } from '../data/domains.js'
import { defineModule, runModules } from './adapter.js'

const mkAlert = (domain, indicator, status) => ({
  domain,
  indicator,
  value: 1,
  baseline: 1,
  status,
  urgency: 10,
  why: 'why',
  action: 'action',
  escalate: false,
  source: 'design value',
})

// Feature: core, Property 24: Missing overall alert is reported
describe('Property 24: Missing overall alert is reported', () => {
  it('reports module name and missing <domain>_overall when it is removed', () => {
    // **Validates: Requirements 8.6**
    fc.assert(
      fc.property(
        fc.constantFrom(...DOMAINS),
        fc.stringMatching(/^[a-z][a-z0-9_]{0,11}$/),
        fc.uniqueArray(fc.stringMatching(/^[a-z]{1,8}$/), { maxLength: 5 }),
        fc.constantFrom('normal', 'watch', 'act'),
        (domain, name, indicators, status) => {
          const inds = indicators.filter((i) => i !== `${domain}_overall`)
          const mod = defineModule({
            name,
            domain,
            kind: 'function',
            run: () => inds.map((i) => mkAlert(domain, i, status)),
          })
          const { alerts, errors } = runModules([mod], {}, { cutoffs: {}, now: 0 })
          const overall = `${domain}_overall`
          const hit = errors.find((e) => e.module === name && String(e.error).includes(overall))
          expect(hit).toBeDefined()
          expect(alerts.length).toBe(inds.length)
        }
      ),
      { numRuns: 100 }
    )
  })
})
