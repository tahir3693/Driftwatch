import { describe, it, expect } from 'vitest'
import raw from './reportConfig.json'
import { loadReportConfig } from './reportConfig.js'
import { validateReportConfig } from '../report/validateReportConfig.js'

describe('loadReportConfig', () => {
  it('loads the shipped file, frozen and cached', () => {
    const c = loadReportConfig()
    expect(Object.isFrozen(c)).toBe(true)
    expect(Object.isFrozen(c.moduleLabels)).toBe(true)
    expect(loadReportConfig()).toBe(c)
  })

  it('has the window, the caps, the six labels and a source', () => {
    const c = loadReportConfig()
    expect(c.windowDays).toBe(7)
    expect(c.maxActiveAlertsPerModule).toBe(6)
    expect(c.maxLastReadings).toBe(12) // set from the print preview check: the 14-day demo fits one A4 and one Letter page
    expect(c.moduleLabels).toEqual({
      radiation: 'Radiation',
      isolation: 'Isolation',
      gravity: 'Gravity',
      environment: 'Environment',
      nutrition: 'Nutrition',
      system: 'Offline and ground report',
    })
    expect(c.source).toBe('design value')
  })

  it('makes the validator throw for invalid variants', () => {
    expect(() => validateReportConfig({ ...raw, maxLastReadings: 0 })).toThrow(TypeError)
    const { system, ...labels } = raw.moduleLabels
    expect(system).toBeTruthy()
    expect(() => validateReportConfig({ ...raw, moduleLabels: labels })).toThrow(TypeError)
    const { source, ...noSource } = raw
    expect(source).toBeTruthy()
    expect(() => validateReportConfig(noSource)).toThrow(TypeError)
  })
})
