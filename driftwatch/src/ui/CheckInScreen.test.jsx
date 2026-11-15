// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CheckInScreen from './CheckInScreen.jsx'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const BANNER = 'Simulated data. Decision support only, not a medical device.'
const formOf = (name) => screen.getByRole('form', { name })

describe('CheckInScreen', () => {
  it('shows five forms in order, each with one submit button, and the banner once', () => {
    render(<CheckInScreen onSubmit={async () => ({ status: 'saved' })} onShowDashboard={() => {}} />)
    const forms = screen.getAllByRole('form')
    expect(forms.map((f) => within(f).getByRole('heading').textContent)).toEqual(['Environment', 'Radiation', 'Isolation', 'Gravity', 'Nutrition'])
    for (const f of forms) {
      const submits = within(f).getAllByRole('button').filter((b) => b.getAttribute('type') === 'submit')
      expect(submits).toHaveLength(1)
    }
    expect(screen.getAllByText(BANNER)).toHaveLength(1)
  })

  it('has a Dashboard switch with a 44 px target that calls onShowDashboard', async () => {
    const onShowDashboard = vi.fn()
    render(<CheckInScreen onSubmit={async () => ({ status: 'saved' })} onShowDashboard={onShowDashboard} />)
    const button = screen.getByRole('button', { name: 'Dashboard' })
    expect(button.className).toMatch(/min-h-11/)
    expect(button.className).toMatch(/min-w-11/)
    await userEvent.click(button)
    expect(onShowDashboard).toHaveBeenCalledTimes(1)
  })

  it('uses a single column grid that becomes two columns at laptop width', () => {
    const { container } = render(<CheckInScreen onSubmit={async () => ({ status: 'saved' })} onShowDashboard={() => {}} />)
    const grid = container.querySelector('.grid')
    expect(grid.className).toContain('grid-cols-1')
    expect(grid.className).toContain('lg:grid-cols-2')
    expect(container.firstChild.className).toContain('overflow-x-hidden')
  })

  it('shows the streak display', () => {
    render(<CheckInScreen onSubmit={async () => ({ status: 'saved' })} streak={{ count: 4, todayModules: 2, increased: true }} onShowDashboard={() => {}} />)
    expect(screen.getByText('Check-in streak: 4 days')).toBeTruthy()
    expect(screen.getByText('Modules checked in today: 2 of 5')).toBeTruthy()
    expect(screen.getByText('Thank you for checking in.')).toBeTruthy()
  })

  it('shows the confirmation next to the form, keeps the values, and passes the raw values to onSubmit', async () => {
    const onSubmit = vi.fn(async () => ({ status: 'saved' }))
    render(<CheckInScreen onSubmit={onSubmit} onShowDashboard={() => {}} />)
    const input = screen.getByLabelText('Share of the planned menu eaten today (%)')
    await userEvent.type(input, '85')
    await userEvent.click(screen.getByRole('button', { name: 'Save Nutrition' }))
    await waitFor(() => expect(within(formOf('Nutrition')).getByText('Saved. Alerts updated.')).toBeTruthy())
    expect(onSubmit).toHaveBeenCalledWith('nutrition', { intake: '85' })
    expect(input.value).toBe('85')
    expect(within(formOf('Gravity')).queryByText('Saved. Alerts updated.')).toBeNull()
  })

  it('shows each failure text next to the form', async () => {
    const results = [
      ['saved_rerun_failed', 'Saved. Alerts could not be updated yet.'],
      ['save_failed', 'Could not save your check-in. Please try again.'],
    ]
    for (const [status, text] of results) {
      cleanup()
      render(<CheckInScreen onSubmit={async () => ({ status })} onShowDashboard={() => {}} />)
      await userEvent.click(screen.getByRole('button', { name: 'Save Gravity' }))
      await waitFor(() => expect(within(formOf('Gravity')).getByText(text)).toBeTruthy())
    }
  })

  it('treats a rejected onSubmit as a failed save and keeps the values', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<CheckInScreen onSubmit={async () => { throw new Error('x') }} onShowDashboard={() => {}} />)
    await userEvent.type(screen.getByLabelText('Exercise sessions in the last 7 days'), '3')
    await userEvent.click(screen.getByRole('button', { name: 'Save Gravity' }))
    await waitFor(() => expect(screen.getByText('Could not save your check-in. Please try again.')).toBeTruthy())
    expect(screen.getByLabelText('Exercise sessions in the last 7 days').value).toBe('3')
  })

  it('wires an invalid result, focuses the first invalid field and announces the message politely', async () => {
    const errors = [
      { field: 'sleep', message: 'Enter a value for Sleep.' },
      { field: 'mood', message: 'Enter a value for Mood and stress.' },
    ]
    render(<CheckInScreen onSubmit={async () => ({ status: 'invalid', errors })} onShowDashboard={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: 'Save Isolation' }))
    const sleep = await screen.findByLabelText('Sleep (h)')
    await waitFor(() => expect(document.activeElement).toBe(sleep))
    expect(sleep.getAttribute('aria-invalid')).toBe('true')
    expect(document.getElementById(sleep.getAttribute('aria-describedby').split(' ').pop()).textContent).toContain('Enter a value for Sleep.')
    const live = screen.getByTestId('checkin-live')
    expect(live.getAttribute('aria-live')).toBe('polite')
    expect(live.textContent).toBe('Isolation: Enter a value for Sleep.')
  })

  it('announces a confirmation in the live region', async () => {
    render(<CheckInScreen onSubmit={async () => ({ status: 'saved' })} onShowDashboard={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: 'Save Radiation' }))
    await waitFor(() => expect(screen.getByText('Radiation: Saved. Alerts updated.')).toBeTruthy())
  })

  it('reaches every control with the Tab key and submits one form with Enter', async () => {
    const onSubmit = vi.fn(async () => ({ status: 'saved' }))
    render(<CheckInScreen onSubmit={onSubmit} onShowDashboard={() => {}} />)
    const seen = new Set()
    for (let i = 0; i < 80; i++) {
      await userEvent.tab()
      seen.add(document.activeElement)
    }
    for (const b of screen.getAllByRole('button')) expect(seen.has(b), b.textContent).toBe(true)
    for (const t of screen.getAllByRole('textbox')) expect(seen.has(t)).toBe(true)
    await userEvent.type(screen.getByLabelText('Share of the planned menu eaten today (%)'), '70{Enter}')
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toBe('nutrition')
  })

  it('makes no network call', async () => {
    const fetchSpy = vi.fn(() => {
      throw new Error('no network')
    })
    vi.stubGlobal('fetch', fetchSpy)
    render(<CheckInScreen onSubmit={async () => ({ status: 'saved' })} onShowDashboard={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: 'Save Gravity' }))
    await waitFor(() => expect(screen.getByText('Saved. Alerts updated.')).toBeTruthy())
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})