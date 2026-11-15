// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import GroundReport, { withoutDuplicateOverall } from './GroundReport.jsx'

afterEach(cleanup)

const NOW = new Date(2025, 0, 15, 12, 0).getTime()
const alert = (domain, indicator, status, urgency, why, action, escalate = false) => ({
  domain, indicator, value: null, baseline: null, status, urgency, why, action, escalate, source: 'design value',
})

describe('withoutDuplicateOverall', () => {
  it('drops an overall alert that repeats another alert of the module word for word', () => {
    const top = alert('gravity', 'low_intake_bone_note', 'watch', 30, 'Same why.', 'Same action.')
    const overall = alert('gravity', 'gravity_overall', 'watch', 30, 'Same why.', 'Same action.')
    expect(withoutDuplicateOverall({ domain: 'gravity', activeAlerts: [top, overall] })).toEqual([top])
  })

  it('keeps an overall alert with its own text', () => {
    const top = alert('radiation', 'cumulative_dose', 'watch', 33, 'Dose why.', 'Dose action.')
    const overall = alert('radiation', 'radiation_overall', 'watch', 32, 'Combined why.', 'Combined action.')
    expect(withoutDuplicateOverall({ domain: 'radiation', activeAlerts: [top, overall] })).toEqual([top, overall])
  })

  it('keeps an overall alert when it is the only active alert, and never drops other alerts', () => {
    const overall = alert('nutrition', 'nutrition_overall', 'watch', 42, 'Why.', 'Action.')
    expect(withoutDuplicateOverall({ domain: 'nutrition', activeAlerts: [overall] })).toEqual([overall])
    const a = alert('isolation', 'mood', 'watch', 34, 'Why.', 'Action.')
    const b = alert('isolation', 'sleep_hours', 'watch', 31, 'Why.', 'Action.')
    expect(withoutDuplicateOverall({ domain: 'isolation', activeAlerts: [a, b] })).toEqual([a, b])
  })
})

describe('GroundReport sheet', () => {
  it('lists a duplicate overall only in the module table and escalations, not twice under Active alerts', () => {
    const alerts = [
      alert('isolation', 'combined_strain', 'act', 60, 'Several signs of strain together for 2 days.', 'Contact the flight surgeon or crew support.', true),
      alert('isolation', 'isolation_overall', 'act', 60, 'Several signs of strain together for 2 days.', 'Contact the flight surgeon or crew support.', true),
    ]
    const data = { status: 'ready', alerts, readings: {}, rules: {}, baselineStats: {} }
    const { container } = render(<GroundReport data={data} now={NOW} onPrint={() => {}} />)
    expect(container.querySelectorAll('.alert-entry')).toHaveLength(1)
    expect(container.querySelector('.alert-entry').textContent).toContain('combined_strain')
    // Both escalations stay listed (escalations are never shortened).
    expect(screen.getAllByText(/isolation_overall/).length).toBeGreaterThan(0)
  })
})
