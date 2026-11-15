import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { patterns } from './patterns.js'

// Feature: core, Property 20: Pattern alert fields
// **Validates: Requirements 6.3, 6.4**

const names = ['a', 'b', 'c', 'd', 'e']
const cutoffs = { watch_from: 40, act_from: 70 }

const defArb = fc.record({
  needs: fc.shuffledSubarray(names, { minLength: 1, maxLength: 5 }),
  for_days: fc.integer({ min: 1, max: 3 }),
  result: fc.constantFrom('watch', 'act'),
  escalate: fc.boolean(),
  why: fc.string({ minLength: 1, maxLength: 20 }),
  action: fc.string({ minLength: 1, maxLength: 20 }),
  source: fc.oneof(fc.constant('design value'), fc.string({ minLength: 1, maxLength: 20 })),
})

describe('Property 20: Pattern alert fields', () => {
  it('copies pattern fields, uses options domain, and names contributors in why', () => {
    fc.assert(
      fc.property(
        defArb,
        fc.constantFrom('radiation', 'isolation', 'gravity', 'environment', 'nutrition', 'system'),
        fc.array(fc.array(fc.constantFrom('normal', 'watch', 'act'), { minLength: 5, maxLength: 5 }), {
          minLength: 1,
          maxLength: 5,
        }),
        (def, domain, statusRows) => {
          const history = statusRows.map((row) =>
            names.map((n, i) => ({ indicator: n, status: row[i] })),
          )
          const def2 = { ...def, min_in_watch: 1 }
          const out = patterns({ p: def2 }, history, { domain, cutoffs })
          for (const alert of out) {
            expect(alert.status).toBe(def.result)
            expect(alert.escalate).toBe(def.escalate)
            expect(alert.action).toBe(def.action)
            expect(alert.source).toBe(def.source)
            expect(alert.domain).toBe(domain)
            const last = history[history.length - 1]
            const contributors = def.needs.filter((n) =>
              last.some((a) => a.indicator === n && a.status !== 'normal'),
            )
            expect(contributors.length).toBeGreaterThan(0)
            for (const c of contributors) expect(alert.why).toContain(c)
          }
        },
      ),
      { numRuns: 100 },
    )
  })
})
