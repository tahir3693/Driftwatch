// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen , cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import HelpPanel from './HelpPanel.jsx'

afterEach(cleanup)

const rule = { label: 'Sleep', howToMeasure: 'Log hours.', whyItMatters: 'Short sleep hurts.', action: 'Sleep more.', source: 'design value' }

describe('HelpPanel', () => {
  it('shows the four headings with the rule text', () => {
    render(<HelpPanel rule={rule} onClose={() => {}} />)
    for (const h of ['How to measure', 'Why it matters', 'What to do', 'Source']) expect(screen.getByRole('heading', { name: h })).toBeTruthy()
    for (const t of ['Log hours.', 'Short sleep hurts.', 'Sleep more.', 'design value']) expect(screen.getByText(t)).toBeTruthy()
  })

  it('falls back to "Not available"', () => {
    render(<HelpPanel rule={undefined} onClose={() => {}} />)
    expect(screen.getAllByText('Not available')).toHaveLength(4)
  })

  it('moves focus to its heading on open', () => {
    render(<HelpPanel rule={rule} onClose={() => {}} />)
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: /Help/ }))
  })

  it('calls onClose on Escape and from the close button', async () => {
    const onClose = vi.fn()
    render(<HelpPanel rule={rule} onClose={onClose} />)
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
    const close = screen.getByRole('button', { name: 'Close' })
    expect(close.className).toContain('min-h-11')
    await userEvent.click(close)
    expect(onClose).toHaveBeenCalledTimes(2)
  })
})
