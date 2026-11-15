// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, within, cleanup } from '@testing-library/react'
import SourcesPanel from './SourcesPanel.jsx'
import sources from '../data/sources.json'
import { DISCLAIMER } from './wording.js'

afterEach(cleanup)

describe('SourcesPanel', () => {
  it('shows the banner, the title and every source', () => {
    render(<SourcesPanel />)
    expect(screen.getByText(DISCLAIMER)).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Sources' })).toBeTruthy()
    for (const g of sources.groups) for (const i of g.items) expect(screen.getByText(i.id)).toBeTruthy()
  })

  it('puts the S-scale and GOES under the NOAA heading with a NOAA label', () => {
    render(<SourcesPanel />)
    const noaa = screen.getByRole('heading', { name: 'NOAA space weather' }).closest('section')
    const scale = within(noaa).getByText('NOAA SWPC Space Weather Scales (S-scale)').closest('li')
    expect(scale.getAttribute('data-publisher')).toBe('NOAA')
    expect(within(scale).getByText('NOAA')).toBeTruthy()
    const nasa = screen.getByRole('heading', { name: 'NASA documents' }).closest('section')
    expect(within(nasa).queryByText(/S-scale/)).toBeNull()
  })
})
