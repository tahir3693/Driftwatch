import { describe, it, expect } from 'vitest'
import { buildTrendModel } from './trendModel.js'

const alert = { domain: 'nutrition', indicator: 'intake_pct_of_plan', value: 84, baseline: 99.5, status: 'watch' }
const rule = { label: 'Food intake', unit: '% of plan' }
const readings = [
  { timestamp: 1_700_000_000_000, value: 100 },
  { timestamp: 1_700_086_400_000, value: 90 },
  { timestamp: 1_700_172_800_000, value: 84 },
]

describe('buildTrendModel', () => {
  it('builds values, point styles and a band', () => {
    const m = buildTrendModel({ alert, rule, readings, stats: { mean: 99.5, sd: 2 } })
    expect(m.empty).toBe(false)
    expect(m.values).toEqual([100, 90, 84])
    expect(m.pointStyles).toEqual(['circle', 'circle', 'rectRot'])
    expect(m.labels).toHaveLength(3)
    expect(m.band.lower).toEqual([97.5, 97.5, 97.5])
    expect(m.band.upper).toEqual([101.5, 101.5, 101.5])
    expect(m.baselineNotReady).toBe(false)
    expect(m.unit).toBe('% of plan')
  })
  it('is empty with no readings', () => {
    const m = buildTrendModel({ alert, rule, readings: [], stats: undefined })
    expect(m.empty).toBe(true)
    expect(m.values).toEqual([])
  })
  it('has no band when the baseline is null', () => {
    const m = buildTrendModel({ alert: { ...alert, baseline: null }, rule, readings })
    expect(m.band).toBeNull()
    expect(m.baselineNotReady).toBe(true)
    expect(m.altText).toContain('baseline not ready')
  })
  it('collapses the band to the baseline when stats are missing', () => {
    const m = buildTrendModel({ alert, rule, readings })
    expect(m.band.lower).toEqual([99.5, 99.5, 99.5])
    expect(m.band.upper).toEqual([99.5, 99.5, 99.5])
  })
  it('uses the indicator as label and no unit without a rule', () => {
    const m = buildTrendModel({ alert, rule: undefined, readings })
    expect(m.title).toBe('intake_pct_of_plan')
    expect(m.unit).toBe('')
  })
  it('states label, latest value, baseline and status in the alt text', () => {
    const m = buildTrendModel({ alert, rule, readings })
    for (const part of ['Food intake', '84', '99.5', 'Watch']) expect(m.altText).toContain(part)
  })
})
