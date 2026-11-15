// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import StreakDisplay from './StreakDisplay.jsx'

afterEach(cleanup)

describe('StreakDisplay', () => {
  it('shows the streak, the modules today and the word Simulated', () => {
    render(<StreakDisplay count={3} todayModules={2} />)
    expect(screen.getByText('Check-in streak: 3 days')).toBeTruthy()
    expect(screen.getByText('Modules checked in today: 2 of 5')).toBeTruthy()
    expect(screen.getByText('Simulated')).toBeTruthy()
    expect(screen.queryByText('Thank you for checking in.')).toBeNull()
  })
  it('uses the singular for one day', () => {
    render(<StreakDisplay count={1} todayModules={1} />)
    expect(screen.getByText('Check-in streak: 1 day')).toBeTruthy()
  })
  it('shows the start message when the streak is 0 and nothing was submitted today', () => {
    render(<StreakDisplay count={0} todayModules={0} />)
    expect(screen.getByText('Check-in streak: 0 days. Submit any form to start a streak.')).toBeTruthy()
    expect(screen.getByText('Modules checked in today: 0 of 5')).toBeTruthy()
  })
  it('thanks the astronaut when the streak increased, with no rating words', () => {
    const { container } = render(<StreakDisplay count={2} todayModules={1} increased />)
    expect(screen.getByText('Thank you for checking in.')).toBeTruthy()
    expect(container.textContent).not.toMatch(/good|bad|great|healthy|poor|normal|abnormal|well done/i)
  })
})