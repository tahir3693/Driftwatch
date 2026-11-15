// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ScenarioControls from './ScenarioControls.jsx'

afterEach(cleanup)

const props = (over = {}) => ({
  day: 0, playing: false, finished: false,
  onPlay: vi.fn(), onPause: vi.fn(), onNext: vi.fn(), onReset: vi.fn(), ...over,
})

describe('ScenarioControls', () => {
  it('shows Play scenario, a Simulated label and the not-started status', () => {
    render(<ScenarioControls {...props()} />)
    expect(screen.getByRole('button', { name: 'Play scenario' })).toBeTruthy()
    expect(screen.getByText('Simulated')).toBeTruthy()
    expect(screen.getByRole('status').textContent).toBe('Not started: showing stored data')
    expect(screen.getByRole('button', { name: 'Reset' }).disabled).toBe(true)
  })

  it('shows the day as text in a polite live region', () => {
    render(<ScenarioControls {...props({ day: 11 })} />)
    const status = screen.getByRole('status')
    expect(status.textContent).toBe('Day 11 of 14 (Simulated)')
    expect(status.getAttribute('aria-live')).toBe('polite')
    expect(screen.getByRole('button', { name: 'Resume scenario' })).toBeTruthy()
  })

  it('works from the keyboard and every control is at least 44 px', async () => {
    const p = props({ day: 3 })
    render(<ScenarioControls {...p} />)
    const user = userEvent.setup()
    await user.tab()
    expect(document.activeElement.textContent).toBe('Resume scenario')
    await user.keyboard('{Enter}')
    expect(p.onPlay).toHaveBeenCalledTimes(1)
    await user.tab() // Pause is disabled while not playing, so focus moves to Next day
    expect(document.activeElement.textContent).toBe('Next day')
    await user.keyboard(' ')
    expect(p.onNext).toHaveBeenCalledTimes(1)
    for (const b of screen.getAllByRole('button')) expect(b.className).toMatch(/min-h-11/)
  })

  it('disables Play while playing and Next day when finished', () => {
    const { rerender } = render(<ScenarioControls {...props({ day: 4, playing: true })} />)
    expect(screen.getByRole('button', { name: 'Resume scenario' }).disabled).toBe(true)
    expect(screen.getByRole('button', { name: 'Pause' }).disabled).toBe(false)
    rerender(<ScenarioControls {...props({ day: 14, finished: true })} />)
    expect(screen.getByRole('button', { name: 'Play again' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Next day' }).disabled).toBe(true)
  })
})
