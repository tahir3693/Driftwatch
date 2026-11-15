// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, within, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('react-chartjs-2', () => ({
  Line: (props) => <canvas role="img" aria-label={props['aria-label']} />,
}))

import Dashboard from './Dashboard.jsx'

const alert = (domain, indicator, status, urgency, extra = {}) => ({
  domain, indicator, value: 5, baseline: 4, status, urgency, why: `why ${indicator}`, action: `action ${indicator}`,
  escalate: false, source: 'design value', ...extra,
})
const data = {
  status: 'ready',
  hasReadings: true,
  alerts: [
    alert('environment', 'body_temperature', 'watch', 40),
    alert('environment', 'environment_overall', 'act', 70, { escalate: true }),
    alert('radiation', 'solar_proton_flux', 'normal', 5),
    alert('gravity', 'hip_bmd', 'normal', 3),
    alert('nutrition', 'intake_pct_of_plan', 'watch', 35),
  ],
  readings: {
    'environment/body_temperature': [
      { timestamp: 1, value: 36 },
      { timestamp: 2, value: 38 },
    ],
  },
  baselineStats: {},
  rules: {
    'environment/body_temperature': { label: 'Body temperature', unit: '°C', howToMeasure: 'Thermometer.', whyItMatters: 'Fever.', action: 'Rest.', source: 'design value' },
  },
}
const BANNER = 'Simulated data. Decision support only, not a medical device.'

afterEach(cleanup)

describe('Dashboard', () => {
  it('shows the banner and the initial prompt', () => {
    render(<Dashboard data={data} />)
    expect(screen.getByText(BANNER)).toBeTruthy()
    expect(screen.getByText('Select a body region to see its alerts.')).toBeTruthy()
    expect(screen.getByRole('region', { name: 'Region details' }).getAttribute('aria-live')).toBe('polite')
  })

  it('shows loading with every region "No data" and the banner', () => {
    render(<Dashboard data={{ status: 'loading', alerts: [], readings: {}, baselineStats: {}, rules: {} }} />)
    expect(screen.getByText('Loading data')).toBeTruthy()
    expect(screen.getByText(BANNER)).toBeTruthy()
    expect(screen.getAllByText('No data')).toHaveLength(3)
  })

  it('shows alert cards ordered by urgency, with why, action, how to measure, why it matters and source', async () => {
    render(<Dashboard data={data} />)
    await userEvent.click(screen.getByRole('button', { name: 'Head and lungs: Act' }))
    const titles = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)
    expect(titles).toEqual(['Overall: environment', 'Body temperature', 'solar_proton_flux'])
    expect(screen.getByText('Thermometer.')).toBeTruthy()
    expect(screen.getByText('Fever.')).toBeTruthy()
    expect(screen.getByText('why body_temperature')).toBeTruthy()
    expect(screen.getByText('action body_temperature')).toBeTruthy()
    expect(screen.getAllByText('Source').length).toBeGreaterThan(0)
  })

  it('draws a chart only for indicators that have stored readings', async () => {
    render(<Dashboard data={data} />)
    await userEvent.click(screen.getByRole('button', { name: /Head and lungs/ }))
    expect(screen.getAllByRole('img')).toHaveLength(1)
  })

  it('shows "No alerts for this region yet." for an empty region', async () => {
    render(<Dashboard data={{ ...data, alerts: [] }} />)
    await userEvent.click(screen.getByRole('button', { name: /Whole body/ }))
    expect(screen.getByText('No alerts for this region yet.')).toBeTruthy()
  })

  it('shows the BMD tracker link only in Bones and muscles', async () => {
    render(<Dashboard data={data} />)
    await userEvent.click(screen.getByRole('button', { name: /Head and lungs/ }))
    expect(screen.queryByRole('link', { name: 'Open BMD and strength tracker' })).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: /Bones and muscles/ }))
    const link = screen.getByRole('link', { name: 'Open BMD and strength tracker' })
    expect(link.getAttribute('href')).toBe(`${import.meta.env.BASE_URL}bmd-strength/index.html`)
  })

  it('opens help, and Escape closes it and restores focus to the opener', async () => {
    render(<Dashboard data={data} />)
    await userEvent.click(screen.getByRole('button', { name: /Head and lungs/ }))
    const card = screen.getByRole('article', { name: /Body temperature/ })
    const help = within(card).getByRole('button', { name: 'Help' })
    await userEvent.click(help)
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('Thermometer.')).toBeTruthy()
    expect(document.activeElement).toBe(within(dialog).getByRole('heading', { name: /Help/ }))
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(help)
  })

  it('renders with fetch stubbed to throw', () => {
    vi.stubGlobal('fetch', () => {
      throw new Error('offline')
    })
    render(<Dashboard data={data} />)
    expect(screen.getByText(BANNER)).toBeTruthy()
    vi.unstubAllGlobals()
  })

  describe('load simulated scenario control', () => {
    it('is shown only with no stored readings and calls the callback', async () => {
      const onLoad = vi.fn().mockResolvedValue(undefined)
      const { rerender } = render(<Dashboard data={{ ...data, hasReadings: false, alerts: [] }} onLoadScenario={onLoad} />)
      const btn = screen.getByRole('button', { name: 'Load simulated 14-day scenario' })
      await userEvent.click(btn)
      expect(onLoad).toHaveBeenCalledTimes(1)
      rerender(<Dashboard data={data} onLoadScenario={onLoad} />)
      expect(screen.queryByRole('button', { name: 'Load simulated 14-day scenario' })).toBeNull()
    })

    it('is hidden while loading and shows an error when the load fails', async () => {
      const { rerender } = render(<Dashboard data={{ status: 'loading', alerts: [], readings: {}, rules: {}, hasReadings: false }} onLoadScenario={() => {}} />)
      expect(screen.queryByRole('button', { name: /Load simulated/ })).toBeNull()
      vi.spyOn(console, 'error').mockImplementation(() => {})
      const onLoad = vi.fn().mockRejectedValue(new Error('x'))
      rerender(<Dashboard data={{ ...data, hasReadings: false, alerts: [] }} onLoadScenario={onLoad} />)
      await userEvent.click(screen.getByRole('button', { name: /Load simulated/ }))
      expect(await screen.findByText('Could not load the simulated scenario.')).toBeTruthy()
      vi.restoreAllMocks()
    })
  })
})
