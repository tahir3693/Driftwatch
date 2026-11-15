// fast-check generators shared by the buildGroundReport property tests. Test support only.
import fc from 'fast-check'

export const DAY = 86_400_000
export const DOMAIN_LIST = ['radiation', 'isolation', 'gravity', 'environment', 'nutrition', 'system']
export const LABELS = {
  radiation: 'Radiation',
  isolation: 'Isolation',
  gravity: 'Gravity',
  environment: 'Environment',
  nutrition: 'Nutrition',
  system: 'Offline and ground report',
}

export const nowArb = fc.integer({ min: 1_000_000_000_000, max: 2_000_000_000_000 })

export const configArb = fc.record({
  windowDays: fc.integer({ min: 1, max: 10 }),
  maxActiveAlertsPerModule: fc.integer({ min: 1, max: 8 }),
  maxLastReadings: fc.integer({ min: 1, max: 12 }),
  moduleLabels: fc.constant(LABELS),
  source: fc.constant('design value'),
})

export const bigConfig = (over = {}) => ({
  windowDays: 7,
  maxActiveAlertsPerModule: 1000,
  maxLastReadings: 1000,
  moduleLabels: LABELS,
  source: 'design value',
  ...over,
})

export const domainArb = fc.constantFrom(...DOMAIN_LIST)
export const statusArb = fc.constantFrom('normal', 'watch', 'act')

export const alertArb = fc.record({
  domain: domainArb,
  indicator: fc.constantFrom('a', 'b', 'c', 'd', 'e'),
  value: fc.integer({ min: 0, max: 500 }),
  baseline: fc.integer({ min: 0, max: 500 }),
  status: statusArb,
  urgency: fc.integer({ min: 0, max: 100 }),
  why: fc.string(),
  action: fc.string(),
  escalate: fc.boolean(),
  source: fc.string(),
})

export const alertsArb = fc.array(alertArb, { maxLength: 30 })

/** Alerts whose urgencies are distinct inside each domain (needed for order independence). */
export const distinctUrgencyAlertsArb = fc
  .array(alertArb, { maxLength: 30 })
  .map((alerts) => {
    const used = {}
    return alerts.map((a) => {
      const set = (used[a.domain] ??= new Set())
      let u = a.urgency
      while (set.has(u)) u += 1
      set.add(u)
      return { ...a, urgency: u }
    })
  })

const IND = ['i1', 'i2', 'i3', 'i4', 'i5', 'i6']

/** Readings with offsets around the window: offset in days from now, may be outside the window. */
export const readingsArb = (now, { distinct = false } = {}) =>
  fc
    .array(
      fc.record({
        domain: domainArb,
        indicator: fc.constantFrom(...IND),
        timestamp: fc.integer({ min: -12 * DAY, max: 2 * DAY }).map((off) => now - off),
        value: fc.integer({ min: -1000, max: 1000 }),
      }),
      { maxLength: 40 },
    )
    .map((list) => {
      if (!distinct) return list
      const seen = new Set()
      return list.filter((r) => {
        const k = `${r.domain}/${r.indicator}/${r.timestamp}`
        if (seen.has(k)) return false
        seen.add(k)
        return true
      })
    })

export const rulesArb = fc.dictionary(
  fc.tuple(domainArb, fc.constantFrom(...IND)).map(([d, i]) => `${d}/${i}`),
  fc.record({ label: fc.oneof(fc.string(), fc.constant(undefined)), unit: fc.oneof(fc.string(), fc.constant(undefined), fc.integer()) }),
)

export const deepFreeze = (v) => {
  if (v !== null && typeof v === 'object' && !Object.isFrozen(v)) {
    Object.freeze(v)
    for (const k of Object.keys(v)) deepFreeze(v[k])
  }
  return v
}
