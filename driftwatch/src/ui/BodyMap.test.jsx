// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen , cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import BodyMap from './BodyMap.jsx'
import mapping from '../data/regionMapping.json'

afterEach(cleanup)

const al = (status, escalate = false) => ({ domain: 'x', indicator: 'i', status, urgency: 10, escalate })
const renderMap = (alertsByRegion = {}, props = {}) =>
  render(<BodyMap alertsByRegion={alertsByRegion} regions={mapping.regions} selectedRegion={null} onSelect={() => {}} {...props} />)

describe('BodyMap', () => {
  it('is an inline svg with no img element and three buttons', () => {
    const { container } = renderMap()
    expect(container.querySelector('svg')).not.toBeNull()
    expect(screen.queryAllByRole('img')).toHaveLength(0)
    expect(container.querySelector('image')).toBeNull()
    expect(screen.getAllByRole('button')).toHaveLength(3)
    expect(screen.getByText('Simulated')).toBeTruthy()
  })

  it('names each region with its status label', () => {
    renderMap({ head_and_lungs: [al('watch')], bones_and_muscles: [al('act')], whole_body: [al('normal')] })
    expect(screen.getByRole('button', { name: 'Head and lungs: Watch' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Bones and muscles: Act' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Whole body: Normal' })).toBeTruthy()
    for (const t of ['Watch', 'Act', 'Normal']) expect(screen.getByText(t)).toBeTruthy()
  })

  it('shows "No data" for an empty region and "Escalate" when an alert escalates', () => {
    renderMap({ bones_and_muscles: [al('act', true)] })
    expect(screen.getByRole('button', { name: 'Head and lungs: No data' })).toBeTruthy()
    expect(screen.getAllByText('No data')).toHaveLength(2)
    expect(screen.getAllByText('Escalate')).toHaveLength(1)
  })

  it('updates when rerendered with new alerts', () => {
    const { rerender } = renderMap({ head_and_lungs: [al('normal')] })
    expect(screen.getByRole('button', { name: 'Head and lungs: Normal' })).toBeTruthy()
    rerender(<BodyMap alertsByRegion={{ head_and_lungs: [al('act')] }} regions={mapping.regions} selectedRegion={null} onSelect={() => {}} />)
    expect(screen.getByRole('button', { name: 'Head and lungs: Act' })).toBeTruthy()
  })

  it('tabs in mapping order and selects with click, Enter and Space', async () => {
    const onSelect = vi.fn()
    renderMap({}, { onSelect })
    const user = userEvent.setup()
    await user.tab()
    expect(document.activeElement.getAttribute('data-region')).toBe('head_and_lungs')
    await user.keyboard('{Enter}')
    await user.tab()
    expect(document.activeElement.getAttribute('data-region')).toBe('bones_and_muscles')
    await user.keyboard(' ')
    await user.tab()
    expect(document.activeElement.getAttribute('data-region')).toBe('whole_body')
    await user.click(document.activeElement)
    expect(onSelect.mock.calls.map((c) => c[0])).toEqual(['head_and_lungs', 'bones_and_muscles', 'whole_body'])
  })

  it('sets aria-pressed on the selected region only', () => {
    renderMap({}, { selectedRegion: 'whole_body' })
    const pressed = screen.getAllByRole('button').map((b) => b.getAttribute('aria-pressed'))
    expect(pressed).toEqual(['false', 'false', 'true'])
  })
})
