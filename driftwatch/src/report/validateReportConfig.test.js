import { describe, it, expect } from 'vitest'
import { validateReportConfig } from './validateReportConfig.js'

const valid = () => ({
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
})

describe('validateReportConfig', () => {
  it('returns the same config when valid', () => {
    const c = valid()
    expect(validateReportConfig(c)).toBe(c)
  })

  it.each([
    ['windowDays', 0],
    ['windowDays', -1],
    ['maxActiveAlertsPerModule', 0],
    ['maxActiveAlertsPerModule', 2.5],
    ['maxLastReadings', -3],
    ['maxLastReadings', '24'],
  ])('throws for %s = %s', (key, value) => {
    expect(() => validateReportConfig({ ...valid(), [key]: value })).toThrow(TypeError)
  })

  it('throws for a missing or empty module label', () => {
    const c = valid()
    delete c.moduleLabels.system
    expect(() => validateReportConfig(c)).toThrow(TypeError)
    expect(() => validateReportConfig({ ...valid(), moduleLabels: { ...valid().moduleLabels, gravity: ' ' } })).toThrow(TypeError)
    expect(() => validateReportConfig({ ...valid(), moduleLabels: null })).toThrow(TypeError)
  })

  it('throws for a missing source', () => {
    const c = valid()
    delete c.source
    expect(() => validateReportConfig(c)).toThrow(TypeError)
    expect(() => validateReportConfig({ ...valid(), source: '' })).toThrow(TypeError)
  })

  it('throws for null and non-objects', () => {
    for (const bad of [null, undefined, 5, 'x', [], true]) expect(() => validateReportConfig(bad)).toThrow(TypeError)
  })
})
