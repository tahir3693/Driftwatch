// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
vi.mock('./ui/useOfflineReady.js', () => ({ useOfflineReady: () => ({ supported: true, ready: true, online: true }) }))
vi.mock('react-chartjs-2', () => ({ Line: (props) => <canvas role="img" aria-label={props['aria-label']} /> }))
import App from './App.jsx'
import { db } from './store/db.js'
import { seedScenario } from './store/seedScenario.js'
import { hasUserEnteredData } from './store/dashboardData.js'
import { resetStoredData } from './store/resetData.js'

const KEY = 'orbit-journal-v1'
const EMPTY_TEXT = 'Nothing logged yet. Play the simulated scenario or add a check-in.'

beforeEach(async () => {
  await db.readings.clear()
  await db.checkins.clear()
  localStorage.clear()
})
afterEach(cleanup)

describe('clean first screen', () => {
  it('shows No data yet, three No data regions, no alerts and the two buttons when nothing is stored', async () => {
    render(<App />)
    expect(await screen.findByText(EMPTY_TEXT)).toBeTruthy()
    expect(screen.getByTestId('status-headline').textContent).toBe('Overall: No data yet')
    for (const name of ['Head and lungs: No data', 'Bones and muscles: No data', 'Whole body: No data']) {
      expect(screen.getByRole('button', { name })).toBeTruthy()
    }
    expect(screen.getByRole('button', { name: 'Play the 14-day scenario' }).className).toMatch(/dw-btn-primary/)
    expect(screen.getByRole('button', { name: 'Add a check-in' })).toBeTruthy()
    expect(screen.getByTestId('scenario-day').textContent).toBe('Not started: nothing logged yet')
    await userEvent.click(screen.getByRole('button', { name: /Bones and muscles/ }))
    expect(screen.getByText('No alerts for this region yet.')).toBeTruthy()
  })

  it('stays clean when only leftover simulated readings are stored (no check-in, empty tracker)', async () => {
    await seedScenario(Date.now())
    localStorage.setItem(KEY, JSON.stringify({ measurements: [], weeklyWorkouts: {}, unit: 'kg' }))
    render(<App />)
    expect(await screen.findByText(EMPTY_TEXT)).toBeTruthy()
    expect(screen.queryByText(/Overall: Act/)).toBeNull()
  })

  it('Play the 14-day scenario starts the scenario', async () => {
    render(<App />)
    await userEvent.click(await screen.findByRole('button', { name: 'Play the 14-day scenario' }))
    expect(screen.getByRole('button', { name: 'Pause' }).disabled).toBe(false)
    await userEvent.click(screen.getByRole('button', { name: 'Pause' }))
  })

  it('shows saved data with "Showing your saved data" once the user has logged in the tracker', async () => {
    localStorage.setItem(KEY, JSON.stringify({ measurements: [], weeklyWorkouts: { '2025-01-13': { strength: true } }, unit: 'kg' }))
    render(<App />)
    await waitFor(() => expect(screen.getByTestId('scenario-day').textContent).toBe('Showing your saved data'))
    expect(screen.queryByText(EMPTY_TEXT)).toBeNull()
  })
})

describe('Reset stored data', () => {
  it('asks first, then clears IndexedDB and the tracker key and shows the clean state', async () => {
    localStorage.setItem(KEY, JSON.stringify({ measurements: [{ id: 'b', created: 1, date: '2025-01-01', baseline: true, hip: 1 }], weeklyWorkouts: {} }))
    await seedScenario(Date.now())
    render(<App />)
    await waitFor(() => expect(screen.getByTestId('scenario-day').textContent).toBe('Showing your saved data'))
    await userEvent.click(screen.getByRole('button', { name: 'Reset stored data' }))
    expect(screen.getByText('This deletes the data saved on this device.')).toBeTruthy()
    expect(await db.readings.count()).toBeGreaterThan(0) // nothing deleted before the confirm
    await userEvent.click(screen.getByRole('button', { name: 'Delete saved data' }))
    expect(await screen.findByText('Saved data deleted.')).toBeTruthy()
    expect(await db.readings.count()).toBe(0)
    expect(await db.checkins.count()).toBe(0)
    expect(localStorage.getItem(KEY)).toBeNull()
    expect(await screen.findByText(EMPTY_TEXT)).toBeTruthy()
    expect(screen.getByTestId('scenario-day').textContent).toBe('Not started: nothing logged yet')
  })

  it('Cancel deletes nothing', async () => {
    localStorage.setItem(KEY, JSON.stringify({ measurements: [{ id: 'b', created: 1, date: '2025-01-01', baseline: true, hip: 1 }] }))
    render(<App />)
    await userEvent.click(await screen.findByRole('button', { name: 'Reset stored data' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(localStorage.getItem(KEY)).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Reset stored data' })).toBeTruthy()
  })
})

describe('hasUserEnteredData and resetStoredData', () => {
  it('counts check-ins and tracker entries, not simulated readings or unticked days', async () => {
    await seedScenario(Date.now())
    expect(await hasUserEnteredData(null)).toBe(false)
    expect(await hasUserEnteredData({ weeklyWorkouts: { '2025-01-13': { strength: false } } })).toBe(false)
    expect(await hasUserEnteredData({ weeklyWorkouts: { '2025-01-13': { endurance: true } } })).toBe(true)
    expect(await hasUserEnteredData({ measurements: [{ date: '2025-01-01' }] })).toBe(true)
    await db.checkins.add({ dayKey: '2025-01-13', module: 'gravity', submittedAt: 1, readingIds: [] })
    expect(await hasUserEnteredData(null)).toBe(true)
  })

  it('resetStoredData clears both stores and survives blocked storage', async () => {
    await seedScenario(Date.now())
    await resetStoredData({ removeItem: () => { throw new Error('blocked') } })
    expect(await db.readings.count()).toBe(0)
  })
})
