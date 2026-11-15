// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Dashboard from './Dashboard.jsx'
import GroundReport from './GroundReport.jsx'
import SpaceWeatherLine from './SpaceWeatherLine.jsx'
import { savedSampleWeather } from '../store/spaceWeather.js'

afterEach(cleanup)

const sw = savedSampleWeather()
const data = { alerts: [], readings: {}, rules: {}, baselineStats: {}, status: 'ready', hasReadings: true }
const radiationAlert = {
  domain: 'radiation', indicator: 'solar_proton_flux', value: 1500, baseline: 1, status: 'act', urgency: 80,
  why: 'Proton flux at S3 level.', action: 'Follow your mission procedure.', escalate: false, source: 'NOAA SWPC GOES proton flux and S-scale',
}
const LINE = `Space weather: NASA DONKI (saved sample, downloaded ${sw.downloaded.slice(0, 10)})`

describe('SpaceWeatherLine', () => {
  it('shows the line, the latest event time and the plain note, and no address or size', () => {
    const { container } = render(<SpaceWeatherLine spaceWeather={sw} />)
    expect(screen.getByText(LINE)).toBeTruthy()
    expect(screen.getByText('Latest DONKI event: 2024-06-12 04:03 UTC.')).toBeTruthy()
    expect(screen.getByText(/real NASA sample saved for May to June 2024/)).toBeTruthy()
    expect(screen.getByText(/scenario values in Driftwatch are simulated/)).toBeTruthy()
    expect(container.textContent).not.toMatch(/https?:|api_key/i)
  })

  it('shows the live line', () => {
    render(<SpaceWeatherLine spaceWeather={{ ...sw, mode: 'live', line: 'Space weather: NASA DONKI (live)' }} />)
    expect(screen.getByText('Space weather: NASA DONKI (live)')).toBeTruthy()
  })

  it('shows nothing without space weather', () => {
    const { container } = render(<SpaceWeatherLine spaceWeather={null} />)
    expect(container.textContent).toBe('')
  })
})

describe('Dashboard', () => {
  it('shows the space weather line in the Head and lungs detail, and not in the other regions', async () => {
    render(<Dashboard data={data} spaceWeather={sw} />)
    expect(screen.queryByText(LINE)).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: /Head and lungs/ }))
    expect(screen.getByText(LINE)).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: /Bones and muscles/ }))
    expect(screen.queryByText(LINE)).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: /Whole body/ }))
    expect(screen.queryByText(LINE)).toBeNull()
  })
})

describe('GroundReport', () => {
  const now = Date.UTC(2025, 0, 15, 12)

  it('shows the line under Radiation next to its alerts', () => {
    render(<GroundReport data={{ ...data, alerts: [radiationAlert, { ...radiationAlert, indicator: 'radiation_overall', why: 'x', action: 'y' }] }} now={now} onPrint={() => {}} spaceWeather={sw} />)
    const block = screen.getByRole('heading', { level: 3, name: 'Radiation' }).closest('.alerts-module')
    expect(within(block).getByText(LINE)).toBeTruthy()
    expect(within(block).getByText('solar_proton_flux')).toBeTruthy()
    expect(screen.getAllByText(LINE)).toHaveLength(1)
  })

  it('shows the line under a Radiation heading even with no active radiation alert', () => {
    render(<GroundReport data={data} now={now} onPrint={() => {}} spaceWeather={sw} />)
    const section = screen.getByRole('heading', { level: 2, name: 'Radiation' }).closest('section')
    expect(within(section).getByText(LINE)).toBeTruthy()
  })

  it('shows no line without space weather', () => {
    render(<GroundReport data={data} now={now} onPrint={() => {}} />)
    expect(screen.queryByText(/Space weather: NASA DONKI/)).toBeNull()
  })
})
