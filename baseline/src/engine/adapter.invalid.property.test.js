import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { defineModule, runModules } from './adapter.js'
import { DOMAINS } from '../data/domains.js'

// Feature: core, Property 23: Invalid alerts are rejected with details
// **Validates: Requirements 8.4, 8.5**

const FIELDS = [
  'domain', 'indicator', 'value', 'baseline', 'status',
  'urgency', 'why', 'action', 'escalate', 'source',
]

const validAlert = fc
  .record({
    domain: fc.constantFrom(...DOMAINS),
    indicator: fc.string({ minLength: 1 }).filter((s) => !s.endsWith('_overall')),
    value: fc.oneof(fc.double({ noNaN: true }), fc.string()),
    baseline: fc.oneof(fc.double({ noNaN: true }), fc.string()),
    status: fc.constantFrom('normal', 'watch', 'act'),
    urgency: fc.integer({ min: 0, max: 100 }),
    why: fc.string(),
    action: fc.string(),
    escalate: fc.boolean(),
    source: fc.string(),
  })

const mutation = fc.oneof(
  fc.record({ kind: fc.constant('remove'), field: fc.constantFrom(...FIELDS) }),
  fc.record({
    kind: fc.constant('add'),
    field: fc.string({ minLength: 1 }).filter((s) => !FIELDS.includes(s) && s !== '__proto__'),
  }),
  fc.record({
    kind: fc.constant('status'),
    bad: fc.oneof(
      fc.string().filter((s) => !['normal', 'watch', 'act'].includes(s)),
      fc.constantFrom('Normal', 'Watch', 'Act', 'ACT'),
    ),
  }),
  fc.record({
    kind: fc.constant('urgency'),
    bad: fc.oneof(
      fc.double({ noNaN: true, noDefaultInfinity: true }).filter((n) => n < 0 || n > 100),
      fc.constantFrom(Infinity, -Infinity, NaN),
    ),
  }),
  fc.record({
    kind: fc.constant('escalate'),
    bad: fc.oneof(fc.string(), fc.integer(), fc.constantFrom(null, undefined)),
  }),
)

function apply(alert, m) {
  const a = { ...alert }
  switch (m.kind) {
    case 'remove':
      delete a[m.field]
      return { a, field: m.field }
    case 'add':
      a[m.field] = 1
      return { a, field: m.field }
    case 'status':
      a.status = m.bad
      return { a, field: 'status' }
    case 'urgency':
      a.urgency = m.bad
      return { a, field: 'urgency' }
    default:
      a.escalate = m.bad
      return { a, field: 'escalate' }
  }
}

describe('Property 23: Invalid alerts are rejected with details', () => {
  it('rejects mutated alerts with {module, indicator, field, message}', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...DOMAINS),
        fc.string({ minLength: 1 }),
        validAlert,
        mutation,
        (domain, name, base, m) => {
          const good = { ...base, domain }
          const { a, field } = apply(good, m)
          const overall = { ...good, indicator: `${domain}_overall` }
          const mod = defineModule({
            name,
            domain,
            kind: 'function',
            run: () => [overall, a],
          })
          const res = runModules([mod], {}, { cutoffs: {}, now: 0 })

          expect(res.alerts).toEqual([overall])
          const errs = res.errors.filter((e) => e.field !== undefined)
          expect(errs).toHaveLength(1)
          const e = errs[0]
          expect(e.module).toBe(name)
          expect(e.field).toBe(field)
          expect(typeof e.message).toBe('string')
          expect(e.message.length).toBeGreaterThan(0)
          expect(e.indicator).toBe(a.indicator)
        },
      ),
      { numRuns: 100 },
    )
  })

  it('accepts unmutated valid alerts', () => {
    fc.assert(
      fc.property(fc.constantFrom(...DOMAINS), validAlert, (domain, base) => {
        const overall = { ...base, domain, indicator: `${domain}_overall` }
        const mod = defineModule({ name: 'm', domain, kind: 'function', run: () => [overall] })
        const res = runModules([mod], {}, { cutoffs: {}, now: 0 })
        expect(res.errors).toEqual([])
        expect(res.alerts).toEqual([overall])
      }),
      { numRuns: 100 },
    )
  })
})
