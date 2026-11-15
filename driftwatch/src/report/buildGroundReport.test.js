import { describe, it, expect } from 'vitest'
import { buildGroundReport } from './buildGroundReport.js'
import { flattenReadings } from './flattenReadings.js'

const DAY = 86_400_000
const NOW = 2_000_000_000_000
const CONFIG = {
  windowDays: 7,
  maxActiveAlertsPerModule: 6,
  maxLastReadings: 24,
  moduleLabels: {
    radiation: 'Radiation',
    isolation: 'Isolation',
    gravity: 'Gravity',
    environment: 'Environment',
    nutrition: 'Nutrition',
    system: 'Offline and ground report',
  },
  source: 'design value',
}
const DOMAIN_ORDER = ['radiation', 'isolation', 'gravity', 'environment', 'nutrition', 'system']

const alert = (over = {}) => ({
  domain: 'nutrition',
  indicator: 'intake_pct_of_plan',
  value: 84,
  baseline: 100,
  status: 'watch',
  urgency: 40,
  why: 'Why text',
  action: 'Action text',
  escalate: false,
  source: 'design value',
  ...over,
})
const reading = (over = {}) => ({ timestamp: NOW - DAY, domain: 'nutrition', indicator: 'intake_pct_of_plan', value: 90, ...over })
const build = (input = {}) => buildGroundReport({ alerts: [], readings: [], rules: {}, now: NOW, config: CONFIG, ...input })

describe('buildGroundReport shape', () => {
  it('gives six modules in order with null status and urgency for empty input', () => {
    const m = build()
    expect(m.modules.map((x) => x.domain)).toEqual(DOMAIN_ORDER)
    expect(m.modules.map((x) => x.label)).toEqual(['Radiation', 'Isolation', 'Gravity', 'Environment', 'Nutrition', 'Offline and ground report'])
    for (const x of m.modules) {
      expect(x.status).toBeNull()
      expect(x.urgency).toBeNull()
      expect(x.activeAlerts).toEqual([])
      expect(x.activeTotal).toBe(0)
      expect(x.moreAlerts).toBe(0)
    }
    expect(m.escalations).toEqual([])
    expect(m.lastReadings).toEqual([])
    expect(m.counts).toEqual({ activeTotal: 0, activeListed: 0, readingsTotal: 0, readingsListed: 0, moreReadings: 0, capped: false })
  })

  it('has the window bounds', () => {
    const m = build()
    expect(m.now).toBe(NOW)
    expect(m.windowStart).toBe(NOW - 604_800_000)
    expect(m.windowEnd).toBe(NOW)
  })

  it('takes the highest status and urgency per module, including normal alerts', () => {
    const m = build({
      alerts: [
        alert({ indicator: 'a', status: 'normal', urgency: 5 }),
        alert({ indicator: 'b', status: 'watch', urgency: 40 }),
        alert({ indicator: 'c', status: 'act', urgency: 70 }),
        alert({ domain: 'gravity', indicator: 'g', status: 'normal', urgency: 10 }),
      ],
    })
    const nutrition = m.modules.find((x) => x.domain === 'nutrition')
    expect(nutrition.status).toBe('act')
    expect(nutrition.urgency).toBe(70)
    expect(nutrition.activeAlerts.map((a) => a.indicator)).toEqual(['c', 'b'])
    const gravity = m.modules.find((x) => x.domain === 'gravity')
    expect(gravity.status).toBe('normal')
    expect(gravity.urgency).toBe(10)
    expect(gravity.activeAlerts).toEqual([])
  })

  it('keeps input order for equal urgency', () => {
    const m = build({ alerts: [alert({ indicator: 'a', urgency: 40 }), alert({ indicator: 'b', urgency: 40 }), alert({ indicator: 'c', urgency: 50 })] })
    expect(m.modules[4].activeAlerts.map((a) => a.indicator)).toEqual(['c', 'a', 'b'])
  })

  it('treats a non-finite urgency as 0', () => {
    const m = build({ alerts: [alert({ indicator: 'a', urgency: NaN }), alert({ indicator: 'b', urgency: 10 })] })
    expect(m.modules[4].urgency).toBe(10)
    expect(m.modules[4].activeAlerts.map((a) => a.indicator)).toEqual(['b', 'a'])
  })

  it('drops alerts with an unknown domain or status, and non-objects', () => {
    const m = build({ alerts: [alert({ domain: 'weather' }), alert({ status: 'critical' }), null, 'x', 5, alert({ indicator: 'ok' })] })
    expect(m.counts.activeTotal).toBe(1)
    expect(m.modules[4].activeAlerts.map((a) => a.indicator)).toEqual(['ok'])
  })

  it('copies why, action and source unchanged and does not share alert objects', () => {
    const input = alert({ why: 'W', action: 'A', source: 'S' })
    const m = build({ alerts: [input] })
    const out = m.modules[4].activeAlerts[0]
    expect(out).toEqual(input)
    expect(out).not.toBe(input)
  })
})

describe('buildGroundReport escalations', () => {
  it('lists every active escalating alert by urgency, with module label and action', () => {
    const m = build({
      alerts: [
        alert({ indicator: 'a', urgency: 50, escalate: true, action: 'Act A' }),
        alert({ domain: 'isolation', indicator: 'b', status: 'act', urgency: 70, escalate: true, action: 'Act B' }),
        alert({ indicator: 'c', urgency: 60, escalate: false }),
        alert({ indicator: 'd', status: 'normal', urgency: 10, escalate: true }),
      ],
    })
    expect(m.escalations).toEqual([
      { domain: 'isolation', label: 'Isolation', indicator: 'b', urgency: 70, status: 'act', action: 'Act B' },
      { domain: 'nutrition', label: 'Nutrition', indicator: 'a', urgency: 50, status: 'watch', action: 'Act A' },
    ])
  })

  it('keeps an escalating alert that the module cap cut from its list', () => {
    const alerts = [
      ...Array.from({ length: 7 }, (_, i) => alert({ indicator: `i${i}`, urgency: 90 - i })),
      alert({ indicator: 'low', urgency: 1, escalate: true }),
    ]
    const m = build({ alerts, config: { ...CONFIG, maxActiveAlertsPerModule: 6 } })
    expect(m.modules[4].activeAlerts.map((a) => a.indicator)).not.toContain('low')
    expect(m.escalations.map((e) => e.indicator)).toEqual(['low'])
  })
})

describe('buildGroundReport caps', () => {
  it('shows "more" counts of 1 for 7 alerts in one module and 25 readings, and sets capped', () => {
    const alerts = Array.from({ length: 7 }, (_, i) => alert({ indicator: `i${i}`, urgency: 10 + i }))
    const readings = Array.from({ length: 25 }, (_, i) => reading({ indicator: `ind${String(i).padStart(2, '0')}`, timestamp: NOW - i * 1000 }))
    const m = build({ alerts, readings })
    const nutrition = m.modules[4]
    expect(nutrition.activeAlerts).toHaveLength(6)
    expect(nutrition.activeTotal).toBe(7)
    expect(nutrition.moreAlerts).toBe(1)
    expect(nutrition.activeAlerts.map((a) => a.urgency)).toEqual([16, 15, 14, 13, 12, 11])
    expect(m.lastReadings).toHaveLength(24)
    expect(m.lastReadings[0].indicator).toBe('ind00')
    expect(m.counts).toEqual({ activeTotal: 7, activeListed: 6, readingsTotal: 25, readingsListed: 24, moreReadings: 1, capped: true })
  })

  it('is not capped at exactly the caps', () => {
    const alerts = Array.from({ length: 6 }, (_, i) => alert({ indicator: `i${i}` }))
    const readings = Array.from({ length: 24 }, (_, i) => reading({ indicator: `x${i}` }))
    expect(build({ alerts, readings }).counts.capped).toBe(false)
  })
})

describe('buildGroundReport readings', () => {
  const only = (r) => build({ readings: [r] }).lastReadings

  it('includes readings exactly at windowStart and now, and excludes 1 ms outside', () => {
    const start = NOW - 7 * DAY
    expect(only(reading({ timestamp: start }))).toHaveLength(1)
    expect(only(reading({ timestamp: NOW }))).toHaveLength(1)
    expect(only(reading({ timestamp: start - 1 }))).toHaveLength(0)
    expect(only(reading({ timestamp: NOW + 1 }))).toHaveLength(0)
  })

  it('excludes a future reading', () => {
    expect(only(reading({ timestamp: NOW + DAY }))).toEqual([])
  })

  it('keeps the greatest timestamp per indicator', () => {
    const m = build({ readings: [reading({ timestamp: NOW - 3 * DAY, value: 1 }), reading({ timestamp: NOW - DAY, value: 2 }), reading({ timestamp: NOW - 2 * DAY, value: 3 })] })
    expect(m.lastReadings).toHaveLength(1)
    expect(m.lastReadings[0].value).toBe(2)
  })

  it('lets the last supplied win for equal timestamps', () => {
    const t = NOW - DAY
    expect(build({ readings: [reading({ timestamp: t, value: 1 }), reading({ timestamp: t, value: 2 })] }).lastReadings[0].value).toBe(2)
    expect(build({ readings: [reading({ timestamp: t, value: 2 }), reading({ timestamp: t, value: 1 })] }).lastReadings[0].value).toBe(1)
  })

  it('drops readings with a bad domain, indicator, timestamp or value', () => {
    const bad = [
      reading({ domain: 'weather' }),
      reading({ indicator: '' }),
      reading({ indicator: 5 }),
      reading({ timestamp: NaN }),
      reading({ timestamp: Infinity }),
      reading({ value: '5' }),
      reading({ value: NaN }),
      null,
      'x',
    ]
    expect(build({ readings: bad }).lastReadings).toEqual([])
  })

  it('uses the rule label and unit, and falls back to the indicator and no unit', () => {
    const rules = { 'nutrition/intake_pct_of_plan': { label: 'Food intake', unit: '% of plan' }, 'nutrition/odd': { label: '', unit: 5 } }
    const m = build({
      rules,
      readings: [reading(), reading({ indicator: 'odd' }), reading({ domain: 'radiation', indicator: 'proton_flux_pfu' })],
    })
    const byInd = Object.fromEntries(m.lastReadings.map((r) => [r.indicator, r]))
    expect(byInd.intake_pct_of_plan).toMatchObject({ indicatorLabel: 'Food intake', unit: '% of plan', label: 'Nutrition' })
    expect(byInd.odd).toMatchObject({ indicatorLabel: 'odd', unit: '' })
    expect(byInd.proton_flux_pfu).toMatchObject({ indicatorLabel: 'proton_flux_pfu', unit: '', label: 'Radiation' })
  })

  it('orders rows newest first, then by domain order, then by indicator', () => {
    const m = build({
      readings: [
        reading({ domain: 'nutrition', indicator: 'z', timestamp: NOW - 100 }),
        reading({ domain: 'radiation', indicator: 'b', timestamp: NOW - 100 }),
        reading({ domain: 'radiation', indicator: 'a', timestamp: NOW - 100 }),
        reading({ domain: 'gravity', indicator: 'old', timestamp: NOW - 5000 }),
        reading({ domain: 'system', indicator: 'new', timestamp: NOW }),
      ],
    })
    expect(m.lastReadings.map((r) => `${r.domain}/${r.indicator}`)).toEqual(['system/new', 'radiation/a', 'radiation/b', 'nutrition/z', 'gravity/old'])
  })
})

describe('buildGroundReport bad input and errors', () => {
  it('treats non-array alerts and readings, and non-object rules, as empty', () => {
    for (const bad of [null, undefined, 'x', 5, {}]) {
      const m = build({ alerts: bad, readings: bad, rules: bad })
      expect(m.modules).toHaveLength(6)
      expect(m.counts.activeTotal).toBe(0)
      expect(m.lastReadings).toEqual([])
    }
  })

  it('throws TypeError for an invalid config', () => {
    for (const config of [undefined, null, {}, { ...CONFIG, windowDays: 0 }, { ...CONFIG, source: '' }]) {
      expect(() => build({ config })).toThrow(TypeError)
    }
    expect(() => buildGroundReport()).toThrow(TypeError)
  })

  it('throws TypeError for a non-finite now', () => {
    for (const now of [NaN, Infinity, undefined, null, '5']) expect(() => build({ now })).toThrow(TypeError)
  })

  it('does not change its inputs', () => {
    const alerts = [alert({ escalate: true }), alert({ indicator: 'z', urgency: 90 })]
    const readings = [reading(), reading({ timestamp: NOW - 2 * DAY })]
    const rules = { 'nutrition/intake_pct_of_plan': { label: 'L', unit: 'u' } }
    const before = JSON.stringify({ alerts, readings, rules, CONFIG })
    const m = build({ alerts, readings, rules })
    m.modules[4].activeAlerts[0].why = 'changed'
    expect(JSON.stringify({ alerts, readings, rules, CONFIG })).toBe(before)
  })

  it('returns plain JSON data', () => {
    const m = build({ alerts: [alert({ escalate: true })], readings: [reading()] })
    expect(JSON.parse(JSON.stringify(m))).toEqual(m)
  })

  it('gives the same model for the same inputs, whatever the order of distinct items', () => {
    const alerts = [alert({ indicator: 'a', urgency: 10 }), alert({ indicator: 'b', urgency: 20 }), alert({ domain: 'gravity', indicator: 'g', urgency: 30 })]
    const readings = [reading({ indicator: 'x' }), reading({ indicator: 'y', timestamp: NOW - 2 * DAY })]
    expect(build({ alerts: [...alerts].reverse(), readings: [...readings].reverse() })).toEqual(build({ alerts, readings }))
  })
})

describe('flattenReadings with buildGroundReport on a DashboardData-shaped fixture', () => {
  it('turns a readings map into Last_Reading rows, with rule labels where a rule exists', () => {
    const data = {
      status: 'ready',
      alerts: [alert({ domain: 'radiation', indicator: 'radiation_overall', status: 'normal', urgency: 3 })],
      readings: {
        'nutrition/intake_pct_of_plan': [reading({ timestamp: NOW - 2 * DAY, value: 95 }), reading({ timestamp: NOW - DAY, value: 84 })],
        'radiation/cumulative_dose_mSv': [{ timestamp: NOW - DAY, domain: 'radiation', indicator: 'cumulative_dose_mSv', value: 196 }],
        'gravity/empty': [],
      },
      rules: { 'nutrition/intake_pct_of_plan': { label: 'Food intake against plan', unit: '% of plan' } },
    }
    const m = buildGroundReport({ alerts: data.alerts, readings: flattenReadings(data.readings), rules: data.rules, now: NOW, config: CONFIG })
    expect(m.lastReadings.map((r) => [r.label, r.indicatorLabel, r.value, r.unit])).toEqual([
      ['Radiation', 'cumulative_dose_mSv', 196, ''],
      ['Nutrition', 'Food intake against plan', 84, '% of plan'],
    ])
    expect(m.modules[0].status).toBe('normal')
  })
})
