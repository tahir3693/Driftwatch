// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { useState } from 'react'
import { render, screen, cleanup, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import EnvironmentForm from './EnvironmentForm.jsx'

afterEach(cleanup)

const EMPTY = { co2: '', headache: null, nauseaFatigue: null, temperature: '' }
const HINT = 'A single day is saved to your history. Possible symptoms raise an alert when they repeat.'

function Harness({ onSubmit = () => {}, errors, resultText }) {
  const [value, setValue] = useState(EMPTY)
  return <EnvironmentForm value={value} onChange={setValue} onSubmit={() => onSubmit(value)} errors={errors} resultText={resultText} />
}

describe('EnvironmentForm', () => {
  it('labels every input and groups the yes or no questions in fieldsets with legends', () => {
    render(<Harness />)
    expect(screen.getByLabelText('Cabin CO2, 1-hour average (mmHg)')).toBeTruthy()
    expect(screen.getByLabelText('Body temperature (deg C)')).toBeTruthy()
    const headache = screen.getByRole('group', { name: 'Headache or vision change today' })
    const nausea = screen.getByRole('group', { name: 'Nausea with fatigue today' })
    expect(within(headache).getAllByRole('radio')).toHaveLength(2)
    expect(within(nausea).getAllByRole('radio')).toHaveLength(2)
    expect(screen.getByRole('heading', { name: 'Environment' })).toBeTruthy()
  })

  it('shows the hint only when the headache answer is yes', async () => {
    render(<Harness />)
    expect(screen.queryByText(HINT)).toBeNull()
    const headache = screen.getByRole('group', { name: 'Headache or vision change today' })
    await userEvent.click(within(headache).getByLabelText('Yes'))
    expect(screen.getByText(HINT)).toBeTruthy()
    await userEvent.click(within(headache).getByLabelText('No'))
    expect(screen.queryByText(HINT)).toBeNull()
  })

  it('wires errors and focuses the first invalid field', () => {
    const errors = [
      { field: 'headache', message: 'Choose yes or no.' },
      { field: 'temperature', message: 'Body temperature must be from 34 to 42 deg C.' },
    ]
    render(<Harness errors={errors} />)
    const first = within(screen.getByRole('group', { name: 'Headache or vision change today' })).getByLabelText('Yes')
    expect(document.activeElement).toBe(first)
    expect(first.getAttribute('aria-invalid')).toBe('true')
    const temp = screen.getByLabelText('Body temperature (deg C)')
    expect(temp.getAttribute('aria-invalid')).toBe('true')
    expect(document.getElementById(temp.getAttribute('aria-describedby')).textContent).toContain('must be from 34 to 42 deg C.')
  })

  it('submits with Enter in a text field', async () => {
    const onSubmit = vi.fn()
    render(<Harness onSubmit={onSubmit} />)
    await userEvent.type(screen.getByLabelText('Cabin CO2, 1-hour average (mmHg)'), '1.8{Enter}')
    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit.mock.calls[0][0].co2).toBe('1.8')
  })

  it('shows the result text next to the form', () => {
    render(<Harness resultText="Saved. Alerts updated." />)
    expect(screen.getByText('Saved. Alerts updated.')).toBeTruthy()
  })
})