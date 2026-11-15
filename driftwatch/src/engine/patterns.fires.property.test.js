import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { patterns } from './patterns.js'

// Feature: core, Property 19: Pattern fires exactly when the rule is met
// **Validates: Requirements 6.2, 6.5**

const NAMES = ['a', 'b', 'c', 'd', 'e']
const cutoffs = { watch_from: 30, act_from: 60, source: 'design value' }

const dayArb = fc.array(
  fc.record({
    indicator: fc.constantFrom(...NAMES, 'other'),
    status: fc.constantFrom('normal', 'watch', 'act'),
  }),
  { maxLength: 8 },
)

const caseArb = fc.record({
  needs: fc.uniqueArray(fc.constantFrom(...NAMES), { minLength: 1, maxLength: 5 }),
  min_in_watch: fc.integer({ min: 1, max: 5 }),
  for_days: fc.integer({ min: 1, max: 4 }),
  history: fc.array(dayArb, { maxLength: 6 }),
})

function expected({ needs, min_in_watch, for_days, history }) {
  if (history.length < for_days) return false
  return history.slice(history.length - for_days).every((day) => {
    const flagged = new Set(
      day.filter((a) => a.status === 'watch' || a.status === 'act').map((a) => a.indicator),
    )
    return needs.filter((n) => flagged.has(n)).length >= min_in_watch
  })
}

describe('Property 19: pattern fires exactly when the rule is met', () => {
  it('returns the pattern alert iff every one of the last for_days days has enough watch/act needs', () => {
    fc.assert(
      fc.property(caseArb, (c) => {
        const def = {
          p: {
            needs: c.needs,
            min_in_watch: c.min_in_watch,
            for_days: c.for_days,
            result: 'watch',
            escalate: false,
            why: 'why',
            action: 'action',
            source: 'design value',
          },
        }
        // History uses the last-writer-wins lookup in patterns, so make each day's
        // indicators unique to keep the oracle unambiguous.
        const history = c.history.map((day) => {
          const seen = new Map()
          for (const a of day) seen.set(a.indicator, a)
          return [...seen.values()]
        })
        const out = patterns(def, history, { domain: 'gravity', cutoffs })
        const fired = out.some((a) => a.indicator === 'p')
        expect(fired).toBe(expected({ ...c, history }))
      }),
      { numRuns: 200 },
    )
  })
})
