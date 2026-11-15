import { describe, it, expect } from 'vitest'
import { alertCardModel } from './alertModel.js'

const alert = {
  domain: 'environment', indicator: 'body_temperature', value: 38.2, baseline: 36.55, status: 'watch',
  urgency: 42, why: 'Why text.', action: 'Action text.', escalate: false, source: 'design value',
}
const rule = { label: 'Body temperature', unit: '°C', howToMeasure: 'Use the thermometer.', whyItMatters: 'Fever matters.' }

describe('alertCardModel', () => {
  it('uses the rule label, unit and help text', () => {
    const m = alertCardModel(alert, rule)
    expect(m.title).toBe('Body temperature')
    expect(m.statusLabel).toBe('Watch')
    expect(m.urgency).toBe(42)
    expect(m.valueText).toBe('38.2 °C')
    expect(m.baselineText).toBe('36.55 °C')
    expect(m.howToMeasure).toBe('Use the thermometer.')
    expect(m.whyItMatters).toBe('Fever matters.')
    expect(m.escalate).toBe(false)
  })
  it('falls back to the indicator, no unit and "Not available" without a rule', () => {
    const m = alertCardModel(alert, undefined)
    expect(m.title).toBe('body_temperature')
    expect(m.valueText).toBe('38.2')
    expect(m.howToMeasure).toBe('Not available')
    expect(m.whyItMatters).toBe('Not available')
  })
  it('titles an overall alert', () => {
    expect(alertCardModel({ ...alert, indicator: 'environment_overall' }, undefined).title).toBe('Overall: environment')
  })
  it('says "Baseline not ready" for a null baseline', () => {
    expect(alertCardModel({ ...alert, baseline: null }, rule).baselineText).toBe('Baseline not ready')
  })
  it('passes why, action and source through, including "design value"', () => {
    const m = alertCardModel(alert, rule)
    expect([m.why, m.action, m.source]).toEqual(['Why text.', 'Action text.', 'design value'])
  })
  it('shows "No data" for a null value and keeps escalate true', () => {
    const m = alertCardModel({ ...alert, value: null, escalate: true }, rule)
    expect(m.valueText).toBe('No data')
    expect(m.escalate).toBe(true)
  })
})
