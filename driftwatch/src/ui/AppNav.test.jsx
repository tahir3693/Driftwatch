// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AppNav from './AppNav.jsx'

afterEach(cleanup)

describe('AppNav', () => {
  it('has five buttons in order inside a Main navigation with the no-print class', () => {
    render(<AppNav view="dashboard" onChange={() => {}} />)
    const nav = screen.getByRole('navigation', { name: 'Main' })
    expect(nav.className).toMatch(/\bno-print\b/)
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual(['Dashboard', 'Check-in', 'Ground report', 'BMD and strength', 'Sources'])
  })

  it.each([
    ['dashboard', 'Dashboard'],
    ['checkin', 'Check-in'],
    ['report', 'Ground report'],
    ['bmd', 'BMD and strength'],
  ])('marks only the current view (%s) with aria-current', (view, name) => {
    render(<AppNav view={view} onChange={() => {}} />)
    const current = screen.getAllByRole('button').filter((b) => b.getAttribute('aria-current') === 'page')
    expect(current.map((b) => b.textContent)).toEqual([name])
  })

  it('calls onChange with the view name of each button', async () => {
    const onChange = vi.fn()
    render(<AppNav view="dashboard" onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: 'Check-in' }))
    await userEvent.click(screen.getByRole('button', { name: 'Ground report' }))
    await userEvent.click(screen.getByRole('button', { name: 'Dashboard' }))
    expect(onChange.mock.calls.map((c) => c[0])).toEqual(['checkin', 'report', 'dashboard'])
  })

  it('gives every button a 44 px touch target', () => {
    render(<AppNav view="dashboard" onChange={() => {}} />)
    for (const b of screen.getAllByRole('button')) {
      expect(b.className).toMatch(/min-h-11/)
      expect(b.className).toMatch(/min-w-11/)
    }
  })

  it('is reached by Tab, one button after another', async () => {
    render(<AppNav view="dashboard" onChange={() => {}} />)
    for (const name of ['Dashboard', 'Check-in', 'Ground report', 'BMD and strength', 'Sources']) {
      await userEvent.tab()
      expect(document.activeElement).toBe(screen.getByRole('button', { name }))
    }
  })
})
