// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, cleanup, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import GroundReport from './GroundReport.jsx'
import { loadReportConfig } from '../data/reportConfig.js'
import { formatDateTime } from '../report/formatTime.js'
import {
  GROUND_REPORT_SIMULATED_LINE,
  NO_ACTIVE_ALERTS,
  NO_ESCALATIONS,
  NO_READINGS,
  CAPPED_NOTE,
} from './groundReportText.js'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const DAY = 86_400_000
const NOW = new Date(2026, 4, 14, 12, 0).getTime()

const alert = (over = {}) => ({
  domain: 'nutrition',
  indicator: 'intake_pct_of_plan',
  value: 84,
  baseline: 100,
  status: 'watch',
  urgency: 42,
  why: 'Intake fell below the personal baseline.',
  action: 'Review the menu plan.',
  escalate: false,
  source: 'design value',
  ...over,
})
const reading = (domain, indicator, value, ageMs = 1000) => ({ timestamp: NOW - ageMs, domain, indicator, value })

const makeData = (over = {}) => ({
  status: 'ready',
  alerts: [
    alert({ domain: 'radiation', indicator: 'radiation_overall', status: 'normal', urgency: 5, why: 'Radiation is steady.', action: 'Keep logging.', source: 'Cited source A' }),
    alert({ domain: 'isolation', indicator: 'mood', status: 'watch', urgency: 34, why: 'Mood is below baseline.', action: 'Talk with the crew.', source: 'Cited source B' }),
    alert({
      domain: 'gravity',
      indicator: 'hip_bmd',
      status: 'act',
      urgency: 70,
      why: 'Hip BMD dropped.',
      action: 'Contact the flight surgeon.',
      escalate: true,
      source: 'Cited source C',
    }),
  ],
  readings: {
    'gravity/hip_bmd': [reading('gravity', 'hip_bmd', 0.9, 2 * DAY)],
    'nutrition/intake_pct_of_plan': [reading('nutrition', 'intake_pct_of_plan', 84)],
    'radiation/proton_flux_pfu': [reading('radiation', 'proton_flux_pfu', 12, 500)],
  },
  rules: {
    'gravity/hip_bmd': { label: 'Hip BMD', unit: 'g/cm2' },
    'nutrition/intake_pct_of_plan': { label: 'Food intake against plan', unit: '% of plan' },
  },
  baselineStats: {},
  hasReadings: true,
  ...over,
})

const renderReport = (props = {}) => render(<GroundReport data={makeData()} now={NOW} onPrint={() => {}} {...props} />)

describe('GroundReport content', () => {
  it('shows the title, product name, Simulated tag, Generated_Timestamp and window times', () => {
    renderReport()
    expect(screen.getByRole('heading', { level: 1, name: 'Ground report' })).toBeTruthy()
    const sheet = screen.getByRole('article')
    expect(within(sheet).getByText('Driftwatch')).toBeTruthy()
    expect(within(sheet).getByText('Simulated')).toBeTruthy()
    // Generated time and window end are the same instant.
    expect(within(sheet).getAllByText(formatDateTime(NOW))).toHaveLength(2)
    expect(within(sheet).getByText(formatDateTime(NOW - 7 * DAY))).toBeTruthy()
  })

  it('shows the six module labels with status text and urgency, and No data for a module without alerts', () => {
    renderReport()
    const table = screen.getAllByRole('table')[0]
    const rows = within(table).getAllByRole('row').slice(1)
    const text = rows.map((r) => r.textContent)
    expect(text).toEqual([
      'RadiationNormal5',
      'IsolationWatch34',
      'GravityAct70',
      'EnvironmentNo dataNo data',
      'NutritionNo dataNo data',
      'Offline and ground reportNo dataNo data',
    ])
  })

  it('gives each of Normal, Watch, Act and No data its own SVG shape', () => {
    renderReport()
    const rows = within(screen.getAllByRole('table')[0]).getAllByRole('row').slice(1)
    const icon = (i) => rows[i].querySelector('svg').getAttribute('data-icon')
    expect([icon(0), icon(1), icon(2), icon(3)]).toEqual(['circle', 'triangle', 'square', 'dash'])
  })

  it('shows active alerts with Recommended action, why and source exactly as supplied', () => {
    renderReport()
    const sheet = screen.getByRole('article')
    expect(within(sheet).getByText('Hip BMD dropped.')).toBeTruthy()
    expect(within(sheet).getByText('Contact the flight surgeon.')).toBeTruthy()
    expect(within(sheet).getByText('Cited source C')).toBeTruthy()
    expect(within(sheet).getAllByText('Recommended action:').length).toBe(2)
    expect(within(sheet).queryByText('Radiation is steady.')).toBeNull()
    expect(within(sheet).getByText('Urgency 70')).toBeTruthy()
  })

  it('shows the escalation section before the per-module section, with label, indicator and urgency', () => {
    renderReport()
    const esc = screen.getByRole('heading', { level: 2, name: 'Open escalations' })
    const alerts = screen.getByRole('heading', { level: 2, name: 'Active alerts' })
    expect(esc.compareDocumentPosition(alerts) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    const section = esc.closest('section')
    expect(section.textContent).toContain('Gravity')
    expect(section.textContent).toContain('hip_bmd')
    expect(section.textContent).toContain('Urgency 70')
  })

  it('shows last readings with rule labels and units, and raw names with no unit for Radiation', () => {
    renderReport()
    const section = screen.getByRole('heading', { level: 2, name: 'Last readings' }).closest('section')
    const rows = within(section).getAllByRole('row').slice(1).map((r) => Array.from(r.querySelectorAll('td')).map((c) => c.textContent))
    expect(rows).toEqual([
      ['Radiation', 'proton_flux_pfu', '12', formatDateTime(NOW - 500)],
      ['Nutrition', 'Food intake against plan', '84 % of plan', formatDateTime(NOW - 1000)],
      ['Gravity', 'Hip BMD', '0.9 g/cm2', formatDateTime(NOW - 2 * DAY)],
    ])
  })

  it('uses headings in order: one h1, h2 sections, h3 per module with alerts', () => {
    renderReport()
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
      'Module status',
      'Open escalations',
      'Active alerts',
      'Last readings',
    ])
    expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual(['Isolation', 'Gravity'])
  })

  it('has real tables with column and row headers', () => {
    renderReport()
    const table = screen.getAllByRole('table')[0]
    expect(within(table).getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Module', 'Status', 'Urgency'])
    expect(within(table).getAllByRole('rowheader')).toHaveLength(6)
  })
})

describe('GroundReport empty states', () => {
  it('shows No data for every module and all three empty texts for empty data, with the simulated line and timestamp', () => {
    renderReport({ data: makeData({ alerts: [], readings: {}, rules: {} }) })
    const rows = within(screen.getAllByRole('table')[0]).getAllByRole('row').slice(1)
    for (const row of rows) expect(row.textContent).toMatch(/No dataNo data$/)
    expect(screen.getByText(NO_ACTIVE_ALERTS)).toBeTruthy()
    expect(screen.getByText(NO_ESCALATIONS)).toBeTruthy()
    expect(screen.getByText(NO_READINGS)).toBeTruthy()
    const line = screen.getByText(GROUND_REPORT_SIMULATED_LINE)
    expect(line.closest('.no-print')).toBeNull()
    expect(line.closest('.report-sheet')).not.toBeNull()
    expect(screen.getAllByText(formatDateTime(NOW)).length).toBeGreaterThan(0)
    expect(screen.queryByText(CAPPED_NOTE)).toBeNull()
  })

  it('shows the simulated line in the sheet, outside any no-print element, with data', () => {
    renderReport()
    const line = screen.getByText(GROUND_REPORT_SIMULATED_LINE)
    expect(line.closest('.no-print')).toBeNull()
    expect(line.closest('.report-sheet')).not.toBeNull()
  })

  it('does not say an action was completed', () => {
    renderReport()
    expect(screen.getByRole('article').textContent).not.toMatch(/\b(completed|done|carried out|taken)\b/i)
  })
})

describe('GroundReport caps', () => {
  const capped = () => {
    const alerts = [alert({ indicator: 'a', urgency: 50 }), alert({ indicator: 'b', urgency: 40 }), alert({ indicator: 'c', urgency: 30 })]
    const readings = {
      k: [reading('nutrition', 'r1', 1, 1000), reading('nutrition', 'r2', 2, 2000), reading('nutrition', 'r3', 3, 3000), reading('nutrition', 'r4', 4, 4000)],
    }
    return { data: makeData({ alerts, readings, rules: {} }), config: { ...loadReportConfig(), maxActiveAlertsPerModule: 2, maxLastReadings: 2 } }
  }

  it('shows the "more" lines and the capped note when lists are shortened', () => {
    renderReport(capped())
    expect(screen.getByText('and 1 more')).toBeTruthy()
    expect(screen.getByText('and 2 more readings')).toBeTruthy()
    expect(screen.getByText(CAPPED_NOTE)).toBeTruthy()
  })

  it('shows no capped note when nothing is shortened', () => {
    renderReport()
    expect(screen.queryByText(CAPPED_NOTE)).toBeNull()
    expect(screen.queryByText(/^and \d+ more/)).toBeNull()
  })
})

describe('GroundReport print button', () => {
  it('has the label, is a native button with a 44 px target, and calls onPrint once per click', async () => {
    const onPrint = vi.fn()
    renderReport({ onPrint })
    const button = screen.getByRole('button', { name: 'Print or Save as PDF' })
    expect(button.tagName).toBe('BUTTON')
    expect(button.className).toMatch(/min-h-11/)
    expect(button.className).toMatch(/min-w-11/)
    await userEvent.click(button)
    expect(onPrint).toHaveBeenCalledTimes(1)
  })

  it('calls window.print by default', async () => {
    const print = vi.fn()
    vi.stubGlobal('print', print)
    render(<GroundReport data={makeData()} now={NOW} />)
    await userEvent.click(screen.getByRole('button', { name: 'Print or Save as PDF' }))
    expect(print).toHaveBeenCalledTimes(1)
  })

  it('does nothing and does not throw when window.print is missing', async () => {
    vi.stubGlobal('print', undefined)
    render(<GroundReport data={makeData()} now={NOW} />)
    await userEvent.click(screen.getByRole('button', { name: 'Print or Save as PDF' }))
  })

  it('is reached by Tab and activated by Enter and Space', async () => {
    const onPrint = vi.fn()
    renderReport({ onPrint })
    await userEvent.tab()
    const button = screen.getByRole('button', { name: 'Print or Save as PDF' })
    expect(document.activeElement).toBe(button)
    await userEvent.keyboard('{Enter}')
    await userEvent.keyboard(' ')
    expect(onPrint).toHaveBeenCalledTimes(2)
  })

  it('is disabled with "Loading data" while the data loads', () => {
    renderReport({ data: makeData({ status: 'loading' }) })
    expect(screen.getByText('Loading data')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Print or Save as PDF' }).disabled).toBe(true)
    expect(screen.queryByRole('article')).toBeNull()
  })

  it('is disabled with "Loading data" while refreshing', async () => {
    const onPrint = vi.fn()
    renderReport({ refreshing: true, onPrint })
    expect(screen.getByText('Loading data')).toBeTruthy()
    const button = screen.getByRole('button', { name: 'Print or Save as PDF' })
    expect(button.disabled).toBe(true)
    await userEvent.click(button)
    expect(onPrint).not.toHaveBeenCalled()
  })

  it('treats a missing now as loading', () => {
    renderReport({ now: null })
    expect(screen.getByText('Loading data')).toBeTruthy()
  })
})

describe('GroundReport print scope and title', () => {
  it('puts the banner and the toolbar in no-print elements', () => {
    renderReport()
    expect(screen.getByRole('note').closest('.no-print')).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Print or Save as PDF' }).closest('.no-print')).not.toBeNull()
    expect(screen.getByRole('article').closest('.no-print')).toBeNull()
  })

  it('shows exactly one simulated banner with the exact text', () => {
    renderReport()
    expect(screen.getAllByText('Simulated data. Decision support, not a medical device.')).toHaveLength(1)
  })

  describe('document title', () => {
    beforeEach(() => {
      document.title = 'Original title'
    })

    it('is set while mounted and restored after unmount', () => {
      const { unmount } = renderReport()
      expect(document.title).toMatch(/^Driftwatch ground report 2026-05-14$/)
      unmount()
      expect(document.title).toBe('Original title')
    })
  })
})

describe('GroundReport offline', () => {
  it('renders and prints with fetch and XMLHttpRequest stubbed to throw, and loads nothing remote', async () => {
    const fetchStub = vi.fn(() => {
      throw new Error('network')
    })
    const xhrStub = vi.fn(() => {
      throw new Error('network')
    })
    vi.stubGlobal('fetch', fetchStub)
    vi.stubGlobal('XMLHttpRequest', xhrStub)
    const onPrint = vi.fn()
    renderReport({ onPrint })
    await userEvent.click(screen.getByRole('button', { name: 'Print or Save as PDF' }))
    expect(onPrint).toHaveBeenCalledTimes(1)
    expect(fetchStub).not.toHaveBeenCalled()
    expect(xhrStub).not.toHaveBeenCalled()
    expect(document.querySelector('img')).toBeNull()
    expect(document.querySelector('link[href^="http"]')).toBeNull()
    expect(document.querySelector('script[src]')).toBeNull()
    expect(document.body.textContent).not.toMatch(/NASA/)
  })
})
