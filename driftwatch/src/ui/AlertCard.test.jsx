// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen , cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AlertCard from './AlertCard.jsx'

afterEach(cleanup)

const alert = {
  domain: 'environment', indicator: 'body_temperature', value: 38.2, baseline: 36.5, status: 'watch',
  urgency: 42, why: 'Temperature is up.', action: 'Rest and re-measure.', escalate: false, source: 'design value',
}
const rule = { label: 'Body temperature', unit: '°C', howToMeasure: 'Use the thermometer.', whyItMatters: 'Fever matters.' }
const NOTICE = 'Escalate: contact the flight surgeon or crew support.'

describe('AlertCard', () => {
  it('shows label, status, urgency, value, baseline, why, action, source and Simulated', () => {
    render(<AlertCard alert={alert} rule={rule} />)
    for (const t of ['Body temperature', 'Watch', '42', '38.2 °C', '36.5 °C', 'Temperature is up.', 'Rest and re-measure.', 'design value', 'Simulated']) {
      expect(screen.getByText(t)).toBeTruthy()
    }
  })

  it('shows How to measure and Why it matters inline', () => {
    render(<AlertCard alert={alert} rule={rule} />)
    expect(screen.getByText('How to measure')).toBeTruthy()
    expect(screen.getByText('Use the thermometer.')).toBeTruthy()
    expect(screen.getByText('Why it matters')).toBeTruthy()
    expect(screen.getByText('Fever matters.')).toBeTruthy()
  })

  it('says "Not available" for both when there is no rule', () => {
    render(<AlertCard alert={alert} />)
    expect(screen.getAllByText('Not available')).toHaveLength(2)
  })

  it('shows the escalation notice only when escalate is true', () => {
    const { rerender } = render(<AlertCard alert={alert} rule={rule} />)
    expect(screen.queryByText(NOTICE)).toBeNull()
    rerender(<AlertCard alert={{ ...alert, escalate: true }} rule={rule} />)
    expect(screen.getByText(NOTICE)).toBeTruthy()
  })

  it('says "Baseline not ready" for a null baseline', () => {
    render(<AlertCard alert={{ ...alert, baseline: null }} rule={rule} />)
    expect(screen.getByText('Baseline not ready')).toBeTruthy()
  })

  it('calls onOpenHelp with the button from the Help button', async () => {
    const onOpenHelp = vi.fn()
    render(<AlertCard alert={alert} rule={rule} onOpenHelp={onOpenHelp} />)
    const btn = screen.getByRole('button', { name: 'Help' })
    expect(btn.className).toContain('min-h-11')
    await userEvent.click(btn)
    expect(onOpenHelp).toHaveBeenCalledWith(btn)
  })
})
