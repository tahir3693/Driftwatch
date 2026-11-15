// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('./ui/useOfflineReady.js', () => ({
  useOfflineReady: () => ({ supported: true, ready: true, online: true }),
}))
vi.mock('react-chartjs-2', () => ({
  Line: (props) => <canvas role="img" aria-label={props['aria-label']} />,
}))

const spies = vi.hoisted(() => ({ calls: [], reject: false }))
vi.mock('./store/dashboardData.js', async (importOriginal) => {
  const original = await importOriginal()
  return {
    ...original,
    useDashboardData: () => {
      const hook = original.useDashboardData()
      return {
        ...hook,
        refresh: (...args) => {
          spies.calls.push(args)
          return spies.reject ? Promise.reject(new Error('refresh failed')) : hook.refresh(...args)
        },
      }
    },
  }
})
import App from './App.jsx'
import { db } from './store/db.js'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})
// The navigation bar and each screen both have a Check-in or Dashboard button; this picks the per-screen one.
const screenButton = (name) =>
  waitFor(() => {
    const nav = screen.getByRole('navigation', { name: 'Main' })
    const found = screen.getAllByRole('button', { name }).filter((b) => !nav.contains(b))
    expect(found).toHaveLength(1)
    return found[0]
  })

beforeEach(async () => {
  await db.readings.clear()
  await db.checkins.clear()
})

describe('App', () => {
  it('shows the title, tagline, offline indicator, one disclaimer and the three regions', async () => {
    render(<App />)
    expect(screen.getByRole('heading', { level: 1, name: 'Driftwatch' })).toBeTruthy()
    expect(screen.getByText('Catch the drift before it becomes a problem.')).toBeTruthy()
    expect(screen.getByTestId('offline-indicator')).toBeTruthy()
    expect(screen.getAllByText('Simulated data. Decision support, not a medical device.')).toHaveLength(1)
    for (const name of [/Head and lungs/, /Bones and muscles/, /Whole body/]) {
      expect(await screen.findByRole('button', { name })).toBeTruthy()
    }
  })

  it('shows the Play scenario button on the first screen', async () => {
    render(<App />)
    expect(await screen.findByRole('button', { name: 'Play scenario' })).toBeTruthy()
    expect(screen.getByTestId('scenario-day').textContent).toBe('Not started: showing stored data')
  })

  it('drives the body map and detail view with the scenario: day 11 Radiation Act, urgency 63, escalate', async () => {
    render(<App />)
    const next = await screen.findByRole('button', { name: 'Next day' })
    for (let i = 0; i < 10; i++) await userEvent.click(next)
    expect(screen.getByTestId('scenario-day').textContent).toBe('Day 10 of 14 (Simulated)')
    expect(screen.getByRole('button', { name: 'Head and lungs: Watch' })).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'Head and lungs: Watch' }))
    await userEvent.click(next)
    expect(screen.getByTestId('scenario-day').textContent).toBe('Day 11 of 14 (Simulated)')
    const region = screen.getByRole('button', { name: 'Head and lungs: Act' })
    expect(region.getAttribute('aria-pressed')).toBe('true')
    // The selected region's detail view follows the day: the radiation overall card is Act, 63, escalating.
    const card = screen.getByRole('article', { name: 'Overall: radiation: Act' })
    expect(within(card).getByText('Urgency:').nextElementSibling.textContent).toBe('63')
    expect(within(card).getByText('Escalate: contact the flight surgeon or crew support.')).toBeTruthy()
    for (const label of ['Why', 'Suggested action', 'Source']) expect(within(card).getByText(label)).toBeTruthy()
    await userEvent.click(next)
    expect(screen.getByRole('button', { name: 'Head and lungs: Watch' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Whole body: Act' })).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'Reset' }))
    expect(screen.getByTestId('scenario-day').textContent).toBe('Not started: showing stored data')
    expect(screen.queryByRole('button', { name: 'Whole body: Act' })).toBeNull()
  })

  it('opens the Sources view with the NASA and NOAA groups', async () => {
    render(<App />)
    const navigation = within(await screen.findByRole('navigation', { name: 'Main' }))
    await userEvent.click(navigation.getByRole('button', { name: 'Sources' }))
    expect(screen.getByRole('heading', { name: 'Sources' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'NASA documents' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'NOAA space weather' })).toBeTruthy()
    expect(screen.getAllByText('Simulated data. Decision support, not a medical device.')).toHaveLength(1)
  })

  it('switches to the check-in screen and back, with one disclaimer on each screen', async () => {
    render(<App />)
    const toCheckIn = await screenButton('Check-in')
    expect(toCheckIn.className).toMatch(/min-h-11/)
    expect(toCheckIn.className).toMatch(/min-w-11/)
    await userEvent.click(toCheckIn)
    expect(screen.getAllByRole('form').map((f) => f.querySelector('h2').textContent)).toEqual(['Environment', 'Radiation', 'Isolation', 'Gravity', 'Nutrition'])
    expect(screen.getByRole('heading', { level: 1, name: 'Driftwatch' })).toBeTruthy()
    expect(screen.getByTestId('offline-indicator')).toBeTruthy()
    expect(screen.getAllByText('Simulated data. Decision support, not a medical device.')).toHaveLength(1)
    await userEvent.click(await screenButton('Dashboard'))
    expect(await screen.findByRole('button', { name: /Head and lungs/ })).toBeTruthy()
    expect(screen.getAllByText('Simulated data. Decision support, not a medical device.')).toHaveLength(1)
  })

  it('saves an Environment check-in, shows the confirmation and the streak, and keeps one Reading set', async () => {
    render(<App />)
    await userEvent.click(await screenButton('Check-in'))
    await userEvent.type(screen.getByLabelText('Cabin CO2, 1-hour average (mmHg)'), '3.4')
    const headache = screen.getByRole('group', { name: 'Headache or vision change today' })
    await userEvent.click(within(headache).getByLabelText('No'))
    const nausea = screen.getByRole('group', { name: 'Nausea with fatigue today' })
    await userEvent.click(within(nausea).getByLabelText('No'))
    await userEvent.type(screen.getByLabelText('Body temperature (deg C)'), '36.7')
    await userEvent.click(screen.getByRole('button', { name: 'Save Environment' }))
    expect(await screen.findByText('Saved. Alerts updated.')).toBeTruthy()
    expect(await screen.findByText('Check-in streak: 1 day')).toBeTruthy()
    expect(screen.getByText('Modules checked in today: 1 of 5')).toBeTruthy()
    expect(screen.getByText('Thank you for checking in.')).toBeTruthy()
    expect(await db.readings.count()).toBe(4)
    await userEvent.click(screen.getByRole('button', { name: 'Save Environment' }))
    await waitFor(async () => expect(await db.readings.count()).toBe(4))
    expect(await db.checkins.count()).toBe(1)
  })

  it('shows field errors, saves nothing, and focuses the first invalid field', async () => {
    render(<App />)
    await userEvent.click(await screenButton('Check-in'))
    await userEvent.type(screen.getByLabelText('Exercise sessions in the last 7 days'), '2.5')
    await userEvent.click(screen.getByRole('button', { name: 'Save Gravity' }))
    const input = screen.getByLabelText('Exercise sessions in the last 7 days')
    expect(await screen.findByText('Exercise sessions must be a whole number.')).toBeTruthy()
    await waitFor(() => expect(document.activeElement).toBe(input))
    expect(await db.readings.count()).toBe(0)
    expect(await db.checkins.count()).toBe(0)
  })

  it('shows the new alert on the dashboard after a check-in, without a reload', async () => {
    render(<App />)
    await userEvent.click(await screenButton('Check-in'))
    await userEvent.type(screen.getByLabelText('Share of the planned menu eaten today (%)'), '40')
    await userEvent.click(screen.getByRole('button', { name: 'Save Nutrition' }))
    expect(await screen.findByText('Saved. Alerts updated.')).toBeTruthy()
    await userEvent.click(await screenButton('Dashboard'))
    expect(screen.queryByRole('button', { name: 'Load simulated 14-day scenario' })).toBeNull()
  })
})

describe('Ground report in the app', () => {
  const LINE = 'All data in this report is simulated. Decision support, not a medical device.'
  const nav = () => within(screen.getByRole('navigation', { name: 'Main' }))
  beforeEach(() => {
    spies.calls = []
    spies.reject = false
  })

  it('shows the navigation on every screen and hides the app header and tagline in print', async () => {
    render(<App />)
    expect(await screen.findByRole('navigation', { name: 'Main' })).toBeTruthy()
    expect(screen.getByRole('heading', { level: 1, name: 'Driftwatch' }).closest('header').className).toMatch(/\bno-print\b/)
    expect(screen.getByText('Catch the drift before it becomes a problem.').className).toMatch(/\bno-print\b/)
    expect(screen.getByTestId('offline-indicator').closest('.no-print')).not.toBeNull()
    await userEvent.click(nav().getByRole('button', { name: 'Check-in' }))
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeTruthy()
    await userEvent.click(nav().getByRole('button', { name: 'Ground report' }))
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeTruthy()
  })

  it('opens the Ground report, shows the title and the simulated line, and goes back to the dashboard', async () => {
    render(<App />)
    await userEvent.click(await nav().findByRole('button', { name: 'Ground report' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Ground report' })).toBeTruthy()
    expect(screen.getByText(LINE)).toBeTruthy()
    expect(nav().getByRole('button', { name: 'Ground report' }).getAttribute('aria-current')).toBe('page')
    expect(screen.getAllByText('Simulated data. Decision support, not a medical device.')).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Print or Save as PDF' })).toBeTruthy()
    await userEvent.click(nav().getByRole('button', { name: 'Dashboard' }))
    expect(await screen.findByRole('button', { name: /Head and lungs/ })).toBeTruthy()
    expect(screen.queryByRole('heading', { level: 1, name: 'Ground report' })).toBeNull()
  })

  it('refreshes once with one numeric now when the report opens, and enables Print after it settles', async () => {
    render(<App />)
    await userEvent.click(await nav().findByRole('button', { name: 'Ground report' }))
    spies.calls = []
    await userEvent.click(nav().getByRole('button', { name: 'Dashboard' }))
    await userEvent.click(nav().getByRole('button', { name: 'Ground report' }))
    expect(spies.calls).toHaveLength(1)
    expect(spies.calls[0]).toHaveLength(1)
    expect(Number.isFinite(spies.calls[0][0])).toBe(true)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Print or Save as PDF' }).disabled).toBe(false))
  })

  it('still shows the report when refresh rejects', async () => {
    spies.reject = true
    render(<App />)
    await userEvent.click(await nav().findByRole('button', { name: 'Ground report' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Ground report' })).toBeTruthy()
    expect(screen.getByText(LINE)).toBeTruthy()
  })

  it('opens the report with fetch stubbed to throw, and never calls it', async () => {
    const fetchStub = vi.fn(() => {
      throw new Error('network')
    })
    vi.stubGlobal('fetch', fetchStub)
    render(<App />)
    await userEvent.click(await nav().findByRole('button', { name: 'Ground report' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Ground report' })).toBeTruthy()
    expect(fetchStub).not.toHaveBeenCalled()
  })

  it('shows the played scenario day in the report: Isolation Act, its escalations and last readings', async () => {
    render(<App />)
    const next = await screen.findByRole('button', { name: 'Next day' })
    for (let i = 0; i < 14; i++) await userEvent.click(next)
    expect(screen.getByRole('button', { name: 'Whole body: Act' })).toBeTruthy()
    spies.calls = []
    await userEvent.click(nav().getByRole('button', { name: 'Ground report' }))
    // During the scenario the report uses the scenario day and does not refresh the stored data.
    expect(spies.calls).toHaveLength(0)
    expect(screen.getByRole('button', { name: 'Print or Save as PDF' }).disabled).toBe(false)
    const esc = (await screen.findByRole('heading', { level: 2, name: 'Open escalations' })).closest('section')
    expect(within(esc).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'Isolation: combined_strain, Urgency 60',
      'Isolation: isolation_overall, Urgency 60',
    ])
    const status = screen.getAllByRole('table')[0]
    expect(within(status).getByRole('rowheader', { name: 'Isolation' }).closest('tr').textContent).toBe('IsolationAct60')
    const readings = screen.getByRole('heading', { level: 2, name: 'Last readings' }).closest('section')
    expect(within(readings).getByText('cumulative_dose_mSv')).toBeTruthy()
    expect(within(readings).getByText('Reaction time')).toBeTruthy()
  })
})

