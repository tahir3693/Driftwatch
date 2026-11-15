import { describe, it, expect } from 'vitest'
import { summarizeAlerts, groupByStatus } from './dashboardSummary.js'
const a = (domain, indicator, status, urgency, escalate = false) => ({ domain, indicator, status, urgency, escalate, value: 1, baseline: null, why: `why ${indicator}`, action: `do ${indicator}`, source: 'design value' })
describe('summarizeAlerts', () => {
  it('builds the headline from the alerts: overall status, alerts in Watch or Act, and those that need attention', () => {
    const s = summarizeAlerts([a('environment', 'co2', 'watch', 40), a('radiation', 'flux', 'act', 80), a('radiation', 'dose', 'normal', 0), a('radiation', 'radiation_overall', 'act', 80, true)])
    expect(s.headline).toBe('Overall: Act, 2 alerts, 1 needs attention')
    expect(s.status).toBe('act')
    expect(s.escalations).toEqual(['Overall: radiation'])
  })
  it('puts the escalating alert first among equal statuses, then the higher urgency', () => {
    const s = summarizeAlerts([a('radiation', 'symptoms', 'act', 100), a('radiation', 'radiation_overall', 'act', 63, true)])
    expect(s.top.indicator).toBe('radiation_overall')
    expect(summarizeAlerts([a('x', 'p', 'watch', 40), a('x', 'q', 'watch', 50)]).top.indicator).toBe('q')
  })
  it('says nothing needs attention when all is Normal, and has an empty state', () => {
    expect(summarizeAlerts([a('x', 'p', 'normal', 0)]).headline).toBe('Overall: Normal, no alerts, nothing needs attention')
    expect(summarizeAlerts([a('x', 'p', 'normal', 0)]).top).toBeNull()
    expect(summarizeAlerts([])).toMatchObject({ empty: true, headline: 'No alerts yet' })
  })
})
describe('groupByStatus', () => {
  it('keeps the order inside each group', () => {
    const g = groupByStatus([a('x', '1', 'act', 9), a('x', '2', 'normal', 0), a('x', '3', 'watch', 5), a('x', '4', 'act', 7)])
    expect(g.act.map((x) => x.indicator)).toEqual(['1', '4'])
    expect(g.watch.map((x) => x.indicator)).toEqual(['3'])
    expect(g.normal.map((x) => x.indicator)).toEqual(['2'])
  })
})
