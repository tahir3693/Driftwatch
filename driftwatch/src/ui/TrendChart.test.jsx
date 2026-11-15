// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen , cleanup } from '@testing-library/react'

const lineProps = vi.hoisted(() => ({ last: null }))
vi.mock('react-chartjs-2', () => ({
  Line: (props) => {
    lineProps.last = props
    return <canvas role="img" aria-label={props['aria-label']} />
  },
}))

import TrendChart from './TrendChart.jsx'

afterEach(cleanup)

const alert = { domain: 'nutrition', indicator: 'intake_pct_of_plan', value: 84, baseline: 99.5, status: 'watch' }
const rule = { label: 'Food intake', unit: '% of plan' }
const readings = [
  { timestamp: 1_700_000_000_000, value: 100 },
  { timestamp: 1_700_086_400_000, value: 84 },
]

beforeEach(() => {
  lineProps.last = null
})

describe('TrendChart', () => {
  it('shows "No readings yet" with no readings and draws no chart', () => {
    render(<TrendChart alert={alert} rule={rule} readings={[]} />)
    expect(screen.getByText('No readings yet')).toBeTruthy()
    expect(lineProps.last).toBeNull()
  })

  it('shows "Baseline not ready" and no baseline dataset with a null baseline', () => {
    render(<TrendChart alert={{ ...alert, baseline: null }} rule={rule} readings={readings} />)
    expect(screen.getByText('Baseline not ready')).toBeTruthy()
    expect(lineProps.last.data.datasets).toHaveLength(1)
  })

  it('passes responsive options, the unit axis title and a "Your baseline" dataset', () => {
    render(<TrendChart alert={alert} rule={rule} readings={readings} stats={{ mean: 99.5, sd: 1 }} />)
    const { options, data } = lineProps.last
    expect(options.responsive).toBe(true)
    expect(options.maintainAspectRatio).toBe(false)
    expect(options.scales.y.title.text).toBe('% of plan')
    expect(data.datasets.map((d) => d.label)).toEqual(['Food intake', 'Baseline lower', 'Your baseline'])
    expect(data.datasets[2].fill).toBe('-1')
    expect(options.plugins.legend.labels.filter({ text: 'Baseline lower' })).toBe(false)
    expect(options.plugins.legend.labels.filter({ text: 'Your baseline' })).toBe(true)
  })

  it('puts the text alternative on the canvas and shows Simulated', () => {
    render(<TrendChart alert={alert} rule={rule} readings={readings} />)
    const img = screen.getByRole('img')
    expect(img.getAttribute('aria-label')).toContain('Food intake')
    expect(img.getAttribute('aria-label')).toContain('Watch')
    expect(screen.getByText('(Simulated)')).toBeTruthy()
  })
})
